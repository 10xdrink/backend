const twilio = require('twilio');
const logger = require('./logger');

// Initialize Twilio client with credentials from environment variables
let client;
try {
  client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );
  logger.info('Twilio client initialized successfully');
} catch (error) {
  logger.error(`Failed to initialize Twilio client: ${error.message}`);
}

// Store OTPs temporarily (in production, consider using Redis)
const otpStore = new Map();

/**
 * Generate a random OTP of specified length
 * @param {number} length Length of OTP
 * @returns {string} Generated OTP
 */
const generateOTP = (length = 6) => {
  // Ensure we generate a numeric OTP with exact length
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return Math.floor(min + Math.random() * (max - min + 1)).toString();
};

/**
 * Send OTP via SMS (with development fallback)
 * @param {string} phoneNumber - Phone number with country code (e.g., +91XXXXXXXXXX)
 * @returns {Promise<{success: boolean, message: string, otp?: string}>}
 */
const sendOTP = async (phoneNumber) => {
  if (!phoneNumber) {
    logger.error('Phone number is required for sending OTP');
    return {
      success: false,
      message: 'Phone number is required'
    };
  }
  
  // Always ensure phone number is in E.164 format
  let formattedPhone = phoneNumber;
  if (!formattedPhone.startsWith('+')) {
    formattedPhone = `+${formattedPhone}`;
  }

  // Log all environment variables related to Twilio
  logger.debug(`TWILIO_ACCOUNT_SID: ${process.env.TWILIO_ACCOUNT_SID ? '✓ Set' : '✗ Not set'}`);
  logger.debug(`TWILIO_AUTH_TOKEN: ${process.env.TWILIO_AUTH_TOKEN ? '✓ Set' : '✗ Not set'}`);
  logger.debug(`TWILIO_PHONE_NUMBER: ${process.env.TWILIO_PHONE_NUMBER ? '✓ Set' : '✗ Not set'}`);

  // Generate OTP
  const otp = generateOTP(6);
  logger.info(`Generated OTP: ${otp} for phone: ${formattedPhone}`);
  
  // Store OTP with expiration time (15 minutes)
  otpStore.set(formattedPhone, {
    otp,
    expiresAt: Date.now() + 15 * 60 * 1000 // 15 minutes in milliseconds
  });
  
  // Log OTP storage
  logger.debug(`Stored OTP for ${formattedPhone} (expires in 15 minutes)`);

  try {
    // Check if Twilio credentials are configured
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
      logger.warn('Twilio credentials not properly configured. Using development mode');
      return {
        success: true,
        message: 'DEVELOPMENT MODE: No SMS sent, but OTP is stored',
        devMode: true,
        devOtp: otp
      };
    }

    // Check if Twilio client is initialized
    if (!client) {
      logger.warn('Twilio client not initialized. Using development mode');
      return {
        success: true,
        message: 'DEVELOPMENT MODE: No SMS sent, but OTP is stored',
        devMode: true,
        devOtp: otp
      };
    }
    
    try {
      // Send SMS with OTP
      const message = await client.messages.create({
        body: `Your 10X verification code is: ${otp}. Valid for 15 minutes.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: formattedPhone
      });
      
      logger.info(`OTP sent to ${formattedPhone}, Twilio SID: ${message.sid}`);
      
      return {
        success: true,
        message: 'OTP sent successfully'
      };
    } catch (twilioError) {
      // Fall back to development mode on any Twilio error
      logger.warn(`Twilio error: ${twilioError.message}. Using development mode fallback.`);
      
      // Specific error logging for debugging
      if (twilioError.code === 21211) {
        logger.error(`Invalid phone number format: ${formattedPhone}`);
      } else if (twilioError.code === 21608) {
        logger.error(`Phone number not verified in trial account: ${formattedPhone}`);
      } else if (twilioError.code === 21610) {
        logger.error(`Twilio trial account restrictions prevent sending to ${formattedPhone}`);
      }
      
      return {
        success: true,
        message: 'DEVELOPMENT MODE: No SMS sent, but OTP is stored (Twilio error fallback)',
        devMode: true,
        devOtp: otp
      };
    }
  } catch (error) {
    // Log error but still return success with dev mode
    logger.error(`Error in sendOTP: ${error.message}`);
    return {
      success: true,
      message: 'DEVELOPMENT MODE: No SMS sent, but OTP is stored (fallback)',
      devMode: true,
      devOtp: otp
    };
  }
};

/**
 * Verify OTP
 * @param {string} phoneNumber - Phone number with country code
 * @param {string} otp - OTP to verify
 * @returns {boolean} Whether OTP is valid
 */
const verifyOTP = (phoneNumber, otp) => {
  if (!phoneNumber || !otp) {
    logger.warn('Phone number and OTP are required for verification');
    return false;
  }
  
  // Format phone number if needed
  let formattedPhone = phoneNumber;
  if (!formattedPhone.startsWith('+')) {
    formattedPhone = `+${formattedPhone}`;
  }
  
  const otpData = otpStore.get(formattedPhone);
  
  if (!otpData) {
    logger.warn(`No OTP found for phone number: ${formattedPhone}`);
    return false; // No OTP found for this phone number
  }
  
  if (Date.now() > otpData.expiresAt) {
    logger.warn(`Expired OTP for phone number: ${formattedPhone}`);
    otpStore.delete(formattedPhone); // Clean up expired OTP
    return false; // OTP expired
  }
  
  logger.debug(`Stored OTP: ${otpData.otp}, Received OTP: ${otp}`);
  
  if (otpData.otp === otp) {
    logger.info(`OTP verified successfully for: ${formattedPhone}`);
    otpStore.delete(formattedPhone); // Clean up used OTP
    return true; // OTP valid
  }
  
  logger.warn(`Invalid OTP attempt for phone number: ${formattedPhone}`);
  return false; // Invalid OTP
};

module.exports = {
  sendOTP,
  verifyOTP,
  otpStore, // Expose OTP store for debugging
  generateOTP
}; 