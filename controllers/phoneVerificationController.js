const asyncHandler = require('express-async-handler');
const { sendOTP, verifyOTP } = require('../utils/twilioUtils');
const PhoneVerification = require('../models/PhoneVerification');
const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * @desc    Send OTP to user's phone number
 * @route   POST /api/verification/phone/send-otp
 * @access  Private
 */
const sendPhoneOTP = asyncHandler(async (req, res) => {
  const { phoneNumber } = req.body;
  const userId = req.user._id;

  if (!phoneNumber) {
    return res.status(400).json({
      success: false,
      message: 'Phone number is required'
    });
  }

  // Format phone number to E.164 format if not already
  let formattedPhoneNumber = phoneNumber;
  if (!formattedPhoneNumber.startsWith('+')) {
    formattedPhoneNumber = `+${formattedPhoneNumber}`;
  }

  try {
    // Find or create verification record
    const verification = await PhoneVerification.findOrCreate(userId, formattedPhoneNumber);
    
    // Rate limiting check - max 5 attempts per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    if (verification.verificationAttempts >= 5 && verification.lastAttemptAt > oneHourAgo) {
      return res.status(429).json({
        success: false,
        message: 'Too many verification attempts. Please try again later.'
      });
    }
    
    // Send OTP
    const result = await sendOTP(formattedPhoneNumber);
    
    // Update verification record
    verification.verificationAttempts += 1;
    verification.lastAttemptAt = new Date();
    await verification.save();
    
    if (result.success) {
      logger.info(`OTP sent successfully to ${formattedPhoneNumber} for user ${userId}`);
      
      // Pass development mode information to the client if available
      if (result.devMode && result.devOtp) {
        return res.status(200).json({
          success: true,
          message: 'OTP sent successfully (Development Mode)',
          devMode: true,
          devOtp: result.devOtp
        });
      }
      
      return res.status(200).json({
        success: true,
        message: 'OTP sent successfully'
      });
    } else {
      logger.error(`Failed to send OTP to ${formattedPhoneNumber}: ${result.message}`);
      return res.status(500).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    logger.error(`Error in sendPhoneOTP: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to send OTP'
    });
  }
});

/**
 * @desc    Verify OTP
 * @route   POST /api/verification/phone/verify-otp
 * @access  Private
 */
const verifyPhoneOTP = asyncHandler(async (req, res) => {
  const { phoneNumber, otp } = req.body;
  const userId = req.user._id;

  if (!phoneNumber || !otp) {
    return res.status(400).json({
      success: false,
      message: 'Phone number and OTP are required'
    });
  }

  // Format phone number to E.164 format if not already
  let formattedPhoneNumber = phoneNumber;
  if (!formattedPhoneNumber.startsWith('+')) {
    formattedPhoneNumber = `+${formattedPhoneNumber}`;
  }

  try {
    // Find verification record
    const verification = await PhoneVerification.findOne({ 
      userId, 
      phoneNumber: formattedPhoneNumber 
    });
    
    if (!verification) {
      logger.warn(`No verification found for user ${userId} with phone ${formattedPhoneNumber}`);
      return res.status(404).json({
        success: false,
        message: 'No verification found for this phone number'
      });
    }
    
    // Verify OTP
    const isValid = verifyOTP(formattedPhoneNumber, otp);
    
    if (isValid) {
      // Update verification record
      verification.verified = true;
      verification.verifiedAt = new Date();
      await verification.save();
      
      // Update user's phone number
      const user = await User.findById(userId);
      if (user) {
        user.phoneNumber = formattedPhoneNumber;
        user.phoneVerified = true;
        
        // For partner/influencer users, you might want to update additional fields
        if (user.role === 'partner') {
          // Update any partner-specific fields if needed
          logger.info(`Updated partner verification status for user ${userId}`);
        }
        
        await user.save();
        logger.info(`Phone verification successful for user ${userId}`);
      }
      
      return res.status(200).json({
        success: true,
        message: 'Phone number verified successfully'
      });
    } else {
      logger.warn(`Invalid OTP attempt for user ${userId}`);
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }
  } catch (error) {
    logger.error(`Error in verifyPhoneOTP: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to verify OTP'
    });
  }
});

/**
 * @desc    Get phone verification status
 * @route   GET /api/verification/phone/status
 * @access  Private
 */
const getPhoneVerificationStatus = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  
  try {
    // Find user's verifications
    const verifications = await PhoneVerification.find({ userId });
    
    // Also get user's verified status from User model
    const user = await User.findById(userId);
    const userPhoneVerified = user ? user.phoneVerified : false;
    
    const verificationStatus = verifications.map(v => ({
      phoneNumber: v.phoneNumber,
      verified: v.verified,
      verifiedAt: v.verifiedAt
    }));
    
    return res.status(200).json({
      success: true,
      userPhoneVerified,
      data: verificationStatus
    });
  } catch (error) {
    logger.error(`Error in getPhoneVerificationStatus: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to get verification status'
    });
  }
});

module.exports = {
  sendPhoneOTP,
  verifyPhoneOTP,
  getPhoneVerificationStatus
}; 