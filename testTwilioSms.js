// Test script for Twilio SMS
require('dotenv').config();
const twilio = require('twilio');
const readline = require('readline');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Initialize Twilio client with credentials
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

console.log('Twilio Test Script');
console.log('==================');
console.log(`Using Account SID: ${accountSid.substring(0, 5)}...${accountSid.substring(accountSid.length - 5)}`);
console.log(`Using From Number: ${fromPhoneNumber}`);

// Prompt for phone number
rl.question('\nEnter the phone number to send SMS to (with country code, e.g., +91XXXXXXXXXX): ', async (phoneNumber) => {
  // Validate phone number format
  if (!phoneNumber.match(/^\+[1-9]\d{1,14}$/)) {
    console.error('Invalid phone number format. Please include the country code starting with + (e.g., +91XXXXXXXXXX)');
    rl.close();
    return;
  }

  // Generate test OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Create message
  const message = `Your 10X verification code is: ${otp}. Valid for 15 minutes.`;
  
  try {
    console.log(`\nSending OTP ${otp} to ${phoneNumber}...`);
    
    // Initialize Twilio client
    const client = twilio(accountSid, authToken);
    
    // Send SMS
    const result = await client.messages.create({
      body: message,
      from: fromPhoneNumber,
      to: phoneNumber
    });
    
    console.log('\nSuccess! Message details:');
    console.log(`SID: ${result.sid}`);
    console.log(`Status: ${result.status}`);
    console.log(`Date Sent: ${result.dateCreated}`);
    
    // Verify the OTP
    rl.question('\nEnter the OTP you received (or any 6 digits to simulate verification): ', (receivedOtp) => {
      if (receivedOtp === otp) {
        console.log('\n✅ OTP verified successfully!');
      } else {
        console.log('\n❌ Invalid OTP. Verification failed.');
      }
      rl.close();
    });
    
  } catch (error) {
    console.error('\nError sending SMS:');
    console.error(`Error Code: ${error.code}`);
    console.error(`Error Message: ${error.message}`);
    
    if (error.code === 21608) {
      console.log('\nNote: This may be because your Twilio trial account can only send to verified numbers.');
    }
    
    rl.close();
  }
}); 