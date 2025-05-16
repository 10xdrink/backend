const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const phoneVerificationController = require('../controllers/phoneVerificationController');

/**
 * @route   POST /api/verification/phone/send-otp
 * @desc    Send OTP to user's phone number
 * @access  Private
 */
router.post('/send-otp', authMiddleware, phoneVerificationController.sendPhoneOTP);

/**
 * @route   POST /api/verification/phone/verify-otp
 * @desc    Verify OTP
 * @access  Private
 */
router.post('/verify-otp', authMiddleware, phoneVerificationController.verifyPhoneOTP);

/**
 * @route   GET /api/verification/phone/status
 * @desc    Get phone verification status
 * @access  Private
 */
router.get('/status', authMiddleware, phoneVerificationController.getPhoneVerificationStatus);

module.exports = router; 