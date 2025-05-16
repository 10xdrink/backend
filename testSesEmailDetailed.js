// testSesEmailDetailed.js
require('dotenv').config();
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

// Set AWS credentials from environment variables
const accessKeyId = process.env.SMTPusername;
const secretAccessKey = process.env.SMTPpassword;
const region = 'us-east-1'; // Explicitly use us-east-1 for SES
const fromEmail = process.env.FROM_EMAIL || process.env.SUPPORT_EMAIL;
const testEmail = process.env.TEST_EMAIL || process.env.SUPPORT_EMAIL;

console.log('=== AWS SES Configuration Test ===');
console.log(`Region: ${region}`);
console.log(`From Email: ${fromEmail}`);
console.log(`Test Email: ${testEmail}`);
console.log(`Access Key ID: ${accessKeyId ? accessKeyId.substring(0, 5) + '...' : 'Not set'}`);
console.log(`Secret Access Key: ${secretAccessKey ? 'Set (hidden)' : 'Not set'}`);

// Create SES client with debug info
const sesClient = new SESClient({
  region,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
  endpoint: `https://email.${region}.amazonaws.com`
});

// Test function to send email
async function sendTestEmail() {
  try {
    console.log('\nAttempting to send test email...');
    
    // Create the email parameters
    const params = {
      Source: fromEmail,
      Destination: {
        ToAddresses: [testEmail],
      },
      Message: {
        Subject: {
          Data: 'AWS SES Test Email',
          Charset: 'UTF-8',
        },
        Body: {
          Text: {
            Data: 'This is a test email sent using AWS SES.',
            Charset: 'UTF-8',
          },
          Html: {
            Data: '<h1>AWS SES Test</h1><p>This is a test email sent using AWS SES from your 10X Drink application.</p>',
            Charset: 'UTF-8',
          },
        },
      },
    };

    console.log('Email parameters configured');
    
    // Send email
    console.log('Sending email command...');
    const command = new SendEmailCommand(params);
    const response = await sesClient.send(command);
    
    console.log('\n✅ SUCCESS! Email sent successfully');
    console.log(`Message ID: ${response.MessageId}`);
    return true;
  } catch (error) {
    console.error('\n❌ ERROR: Failed to send email');
    console.error(`Error Message: ${error.message}`);
    
    // Additional error details
    if (error.Code) {
      console.error(`Error Code: ${error.Code}`);
    }
    if (error.$metadata) {
      console.error('Error Metadata:', JSON.stringify(error.$metadata, null, 2));
    }
    
    // Common SES errors and troubleshooting tips
    if (error.message.includes('ENOTFOUND')) {
      console.error('\nTROUBLESHOOTING: DNS resolution failed. Check your internet connection and AWS endpoint.');
    } else if (error.message.includes('credentials')) {
      console.error('\nTROUBLESHOOTING: Invalid credentials. Verify your AWS access key and secret key.');
    } else if (error.message.includes('not authorized') || error.message.includes('not verified')) {
      console.error('\nTROUBLESHOOTING: Email address not verified. In SES sandbox mode, both sender and recipient must be verified.');
    }
    
    console.error('\nPlease update your .env file with the correct AWS SES configuration:');
    console.error(`
# AWS SES Configuration
AWS_REGION=us-east-1
SMTPusername=your_access_key_id
SMTPpassword=your_secret_access_key
FROM_EMAIL=your_verified_email@example.com
    `);
    
    return false;
  }
}

// Run the test
sendTestEmail();
