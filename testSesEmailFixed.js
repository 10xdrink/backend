// testSesEmailFixed.js
require('dotenv').config();
const { sendEmail } = require('./services/emailService');
const logger = require('./utils/logger');

// Test email function with improved error handling
const testSesEmailFixed = async () => {
  try {
    const testEmail = process.env.TEST_EMAIL || process.env.SUPPORT_EMAIL;
    
    if (!testEmail) {
      console.error('Please provide a TEST_EMAIL in your .env file or use SUPPORT_EMAIL');
      process.exit(1);
    }

    console.log(`Sending test email to: ${testEmail}`);
    console.log('Using AWS credentials:');
    console.log(`- Access Key ID: ${process.env.SMTPusername ? process.env.SMTPusername.substring(0, 5) + '...' : 'Not set'}`);
    console.log(`- Secret Access Key: ${process.env.SMTPpassword ? 'Set (hidden)' : 'Not set'}`);
    console.log(`- From Email: ${process.env.FROM_EMAIL || process.env.SUPPORT_EMAIL || 'tenexformula7@gmail.com'}`);
    
    await sendEmail({
      email: testEmail,
      subject: 'AWS SES Test Email - Fixed Configuration',
      message: 'This is a test email sent using AWS SES with fixed configuration.',
      html: '<h1>AWS SES Test - Fixed</h1><p>This is a test email sent using AWS SES from your 10X Drink application with the fixed configuration.</p>'
    });
    
    console.log('✅ Test email sent successfully!');
  } catch (error) {
    console.error('❌ Failed to send test email:', error);
    
    // Additional troubleshooting information
    if (error.message.includes('signature')) {
      console.error('\nTROUBLESHOOTING: Signature mismatch issue:');
      console.error('1. Check that your AWS credentials are correct and properly formatted');
      console.error('2. Ensure your system clock is synchronized');
      console.error('3. Verify that you are using the correct AWS region for your SES service');
    }
  }
};

// Run the test
testSesEmailFixed();
