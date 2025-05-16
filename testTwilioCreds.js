require('dotenv').config();
const twilioUtils = require('./utils/twilioUtils');
const readline = require('readline');

// Log environment variables for Twilio
console.log('Twilio Environment Variables:');
console.log('TWILIO_ACCOUNT_SID:', process.env.TWILIO_ACCOUNT_SID ? '✓ Set' : '✗ Not set');
console.log('TWILIO_AUTH_TOKEN:', process.env.TWILIO_AUTH_TOKEN ? '✓ Set' : '✗ Not set');
console.log('TWILIO_PHONE_NUMBER:', process.env.TWILIO_PHONE_NUMBER ? '✓ Set' : '✗ Not set');

if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
  console.error('\nError: Twilio credentials are not set in .env file');
  console.log('\nPlease add the following to your .env file:');
  console.log('TWILIO_ACCOUNT_SID=your_account_sid');
  console.log('TWILIO_AUTH_TOKEN=your_auth_token');
  console.log('TWILIO_PHONE_NUMBER=your_twilio_phone_number');
  process.exit(1);
}

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to test OTP generation and storage
async function testOTPGeneration() {
  // Generate a test OTP
  const otp = twilioUtils.generateOTP(6);
  console.log(`\nTest OTP generated: ${otp}`);

  // Check if OTP is valid
  if (otp.length !== 6 || isNaN(parseInt(otp))) {
    console.error('Error: Generated OTP is invalid');
    return false;
  }

  return true;
}

// Function to test sending OTP
async function testSendOTP(phoneNumber) {
  console.log(`\nAttempting to send OTP to ${phoneNumber}...`);
  
  try {
    const result = await twilioUtils.sendOTP(phoneNumber);
    
    if (result.success) {
      console.log('\n✓ OTP sent successfully!');
      
      // If we're in development mode, we have access to the OTP store
      if (twilioUtils.otpStore) {
        const otpData = twilioUtils.otpStore.get(phoneNumber);
        if (otpData) {
          console.log(`OTP for verification: ${otpData.otp}`);
          console.log(`Expires at: ${new Date(otpData.expiresAt).toLocaleTimeString()}`);
        }
      }
      
      return true;
    } else {
      console.error(`\n✗ Failed to send OTP: ${result.message}`);
      return false;
    }
  } catch (error) {
    console.error('\n✗ Error sending OTP:', error.message);
    return false;
  }
}

// Function to test OTP verification
async function testVerifyOTP(phoneNumber, inputOTP) {
  console.log(`\nAttempting to verify OTP ${inputOTP} for ${phoneNumber}...`);
  
  try {
    const isValid = twilioUtils.verifyOTP(phoneNumber, inputOTP);
    
    if (isValid) {
      console.log('\n✓ OTP verified successfully!');
      return true;
    } else {
      console.error('\n✗ Invalid or expired OTP');
      return false;
    }
  } catch (error) {
    console.error('\n✗ Error verifying OTP:', error.message);
    return false;
  }
}

// Main test function
async function runTest() {
  console.log('\n=== Twilio Credentials and OTP Test ===\n');
  
  // Test OTP generation
  const otpGenSuccess = await testOTPGeneration();
  if (!otpGenSuccess) {
    rl.close();
    return;
  }
  
  // Get phone number from user
  rl.question('\nEnter your phone number with country code (e.g., +1234567890): ', async (phoneNumber) => {
    // Format phone number if needed
    let formattedPhone = phoneNumber;
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = `+${formattedPhone}`;
    }
    
    // Test sending OTP
    const sendSuccess = await testSendOTP(formattedPhone);
    if (!sendSuccess) {
      rl.close();
      return;
    }
    
    // Get OTP from user for verification
    rl.question('\nEnter the OTP you received (or check the console output in dev mode): ', async (inputOTP) => {
      await testVerifyOTP(formattedPhone, inputOTP);
      
      console.log('\nTest completed.');
      rl.close();
    });
  });
}

// Run the test
runTest(); 