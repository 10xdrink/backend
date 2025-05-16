// testSesIndia.js
require('dotenv').config();
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

// Log AWS configuration details
console.log('=== AWS SES Configuration (India Region) ===');
console.log(`Region: ${process.env.AWS_REGION}`);
console.log(`Access Key ID: ${process.env.AWS_ACCESS_KEY_ID ? process.env.AWS_ACCESS_KEY_ID.substring(0, 5) + '...' : 'Not set'}`);
console.log(`Secret Access Key: ${process.env.AWS_SECRET_ACCESS_KEY ? 'Set (hidden)' : 'Not set'}`);
console.log(`From Email: ${process.env.FROM_EMAIL || 'Not set'}`);

// Create SES client specifically for ap-south-1
const sesClient = new SESClient({
  region: 'ap-south-1', // Explicitly use ap-south-1 for India
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Test function to send email
async function sendTestEmail() {
  try {
    const testEmail = process.env.TEST_EMAIL || process.env.FROM_EMAIL || 'info@10xdrink.com';
    console.log(`\nSending test email to: ${testEmail}`);
    
    // Create the email parameters
    const params = {
      Source: process.env.FROM_EMAIL || 'info@10xdrink.com',
      Destination: {
        ToAddresses: [testEmail],
      },
      Message: {
        Subject: {
          Data: 'AWS SES Test Email (India Region)',
          Charset: 'UTF-8',
        },
        Body: {
          Text: {
            Data: 'This is a test email sent using AWS SES from ap-south-1 region.',
            Charset: 'UTF-8',
          },
          Html: {
            Data: '<h1>AWS SES Test (India Region)</h1><p>This is a test email sent using AWS SES from your 10X Drink application using the ap-south-1 region.</p>',
            Charset: 'UTF-8',
          },
        },
      },
    };
    
    // Send email
    console.log('Sending email command...');
    const command = new SendEmailCommand(params);
    const response = await sesClient.send(command);
    
    console.log('\n✅ SUCCESS! Email sent successfully');
    console.log(`Message ID: ${response.MessageId}`);
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
    if (error.message.includes('InvalidClientTokenId')) {
      console.error('\nTROUBLESHOOTING: Invalid client token ID error:');
      console.error('1. Your AWS account may not have SES enabled in the ap-south-1 region');
      console.error('2. The IAM user may not have permissions to use SES');
      console.error('3. The access key may be invalid or from a different AWS account');
      console.error('\nPossible solutions:');
      console.error('1. Verify SES is available in your AWS account for ap-south-1 region');
      console.error('2. Try using a different region where SES is enabled (e.g., us-east-1)');
      console.error('3. Check IAM permissions for the user');
    } else if (error.message.includes('not verified')) {
      console.error('\nTROUBLESHOOTING: Email address not verified:');
      console.error('In SES sandbox mode, both sender and recipient email addresses must be verified');
      console.error('Go to AWS SES console and verify your email addresses');
    }
  }
}

// Run the test
sendTestEmail();
