// testSmtpEmail.js
require('dotenv').config();
const nodemailer = require('nodemailer');

// Get credentials from environment variables
const smtpUsername = process.env.SMTPusername;
const smtpPassword = process.env.SMTPpassword;
const fromEmail = process.env.FROM_EMAIL || process.env.SUPPORT_EMAIL;
const testEmail = process.env.TEST_EMAIL || process.env.SUPPORT_EMAIL;

console.log('=== AWS SES SMTP Test ===');
console.log(`From Email: ${fromEmail}`);
console.log(`Test Email: ${testEmail}`);
console.log(`SMTP Username: ${smtpUsername ? smtpUsername.substring(0, 5) + '...' : 'Not set'}`);
console.log(`SMTP Password: ${smtpPassword ? 'Set (hidden)' : 'Not set'}`);

// Create a transporter using AWS SES SMTP
const transporter = nodemailer.createTransport({
  host: 'email-smtp.us-east-1.amazonaws.com',
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: smtpUsername,
    pass: smtpPassword,
  },
  debug: true // Enable debug output
});

// Test function to send email
async function sendTestEmail() {
  try {
    console.log('\nVerifying SMTP configuration...');
    
    // Verify SMTP connection
    const verification = await transporter.verify();
    console.log('SMTP Connection verified:', verification);
    
    console.log('\nAttempting to send test email...');
    
    // Create mail options
    const mailOptions = {
      from: fromEmail,
      to: testEmail,
      subject: 'AWS SES SMTP Test Email',
      text: 'This is a test email sent using AWS SES SMTP.',
      html: '<h1>AWS SES SMTP Test</h1><p>This is a test email sent using AWS SES SMTP from your 10X Drink application.</p>',
    };
    
    // Send email
    const info = await transporter.sendMail(mailOptions);
    
    console.log('\n✅ SUCCESS! Email sent successfully');
    console.log(`Message ID: ${info.messageId}`);
    console.log(`Response: ${info.response}`);
    return true;
  } catch (error) {
    console.error('\n❌ ERROR: Failed to send email');
    console.error(`Error Message: ${error.message}`);
    
    // Common SMTP errors and troubleshooting tips
    if (error.message.includes('ECONNREFUSED')) {
      console.error('\nTROUBLESHOOTING: Connection refused. Check your SMTP server host and port.');
    } else if (error.message.includes('Invalid login')) {
      console.error('\nTROUBLESHOOTING: Invalid credentials. Verify your SMTP username and password.');
    } else if (error.message.includes('not verified')) {
      console.error('\nTROUBLESHOOTING: Email address not verified. In SES sandbox mode, both sender and recipient must be verified.');
    }
    
    console.error('\nPlease update your .env file with the correct AWS SES SMTP configuration:');
    console.error(`
# AWS SES SMTP Configuration
SMTPusername=your_ses_smtp_username
SMTPpassword=your_ses_smtp_password
FROM_EMAIL=your_verified_email@example.com
    `);
    
    return false;
  }
}

// Run the test
sendTestEmail();
