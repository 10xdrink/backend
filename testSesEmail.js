// testSesEmail.js
require('dotenv').config();
const { sendEmail } = require('./services/emailService');
const logger = require('./utils/logger');

// Test email function
const testSesEmail = async () => {
  try {
    const testEmail = process.env.TEST_EMAIL || process.env.SUPPORT_EMAIL;
    
    if (!testEmail) {
      console.error('Please provide a TEST_EMAIL in your .env file or use SUPPORT_EMAIL');
      process.exit(1);
    }

    console.log(`Sending test email to: ${testEmail}`);
    
    await sendEmail({
      email: testEmail,
      subject: 'AWS SES Test Email',
      message: 'This is a test email sent using AWS SES.',
      html: '<h1>AWS SES Test</h1><p>This is a test email sent using AWS SES from your 10X Drink application.</p>'
    });
    
    console.log('Test email sent successfully!');
  } catch (error) {
    console.error('Failed to send test email:', error);
  }
};

// Run the test
testSesEmail();
