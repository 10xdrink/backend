// testSesAlternative.js
require('dotenv').config();
const { SES } = require('aws-sdk');

// Set AWS credentials directly
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const AWS_REGION = process.env.AWS_REGION || 'ap-south-1';
const FROM_EMAIL = process.env.FROM_EMAIL || 'info@10xdrink.com';
const TEST_EMAIL = process.env.TEST_EMAIL || process.env.FROM_EMAIL || 'info@10xdrink.com';

console.log('=== AWS SES Test (Using aws-sdk v2) ===');
console.log(`Region: ${AWS_REGION}`);
console.log(`Access Key ID: ${AWS_ACCESS_KEY_ID ? AWS_ACCESS_KEY_ID.substring(0, 5) + '...' : 'Not set'}`);
console.log(`Secret Access Key: ${AWS_SECRET_ACCESS_KEY ? 'Set (hidden)' : 'Not set'}`);
console.log(`From Email: ${FROM_EMAIL}`);
console.log(`Test Email: ${TEST_EMAIL}`);

// Create SES service object with explicit configuration
const ses = new SES({
  region: AWS_REGION,
  accessKeyId: AWS_ACCESS_KEY_ID,
  secretAccessKey: AWS_SECRET_ACCESS_KEY,
  apiVersion: '2010-12-01'
});

// Test function to send email
async function sendTestEmail() {
  try {
    console.log('\nSending test email...');
    
    // Set up email parameters
    const params = {
      Source: FROM_EMAIL,
      Destination: {
        ToAddresses: [TEST_EMAIL]
      },
      Message: {
        Subject: {
          Data: 'AWS SES Test (Alternative Method)',
          Charset: 'UTF-8'
        },
        Body: {
          Text: {
            Data: 'This is a test email sent using AWS SES with the aws-sdk v2 library.',
            Charset: 'UTF-8'
          },
          Html: {
            Data: '<h1>AWS SES Test (Alternative Method)</h1><p>This is a test email sent using AWS SES with the aws-sdk v2 library.</p>',
            Charset: 'UTF-8'
          }
        }
      }
    };
    
    // Send the email
    console.log('Sending email command...');
    const data = await ses.sendEmail(params).promise();
    
    console.log('\n✅ SUCCESS! Email sent successfully');
    console.log(`Message ID: ${data.MessageId}`);
  } catch (error) {
    console.error('\n❌ ERROR: Failed to send email');
    console.error(`Error Message: ${error.message}`);
    
    if (error.code) {
      console.error(`Error Code: ${error.code}`);
    }
    
    // Provide troubleshooting guidance based on error
    if (error.code === 'InvalidClientTokenId') {
      console.error('\nTROUBLESHOOTING: Your AWS access key ID is invalid');
      console.error('1. Check if the access key is active in your AWS IAM console');
      console.error('2. Verify that the access key belongs to the correct AWS account');
      console.error('3. Make sure you have SES permissions');
    } else if (error.code === 'SignatureDoesNotMatch') {
      console.error('\nTROUBLESHOOTING: Signature mismatch error');
      console.error('1. Your secret access key might be incorrect');
      console.error('2. There might be special characters in your secret key causing issues');
      console.error('3. Try regenerating your AWS access keys in the IAM console');
    } else if (error.code === 'MessageRejected') {
      console.error('\nTROUBLESHOOTING: Email was rejected');
      console.error('1. Verify that your sending domain is verified in SES');
      console.error('2. If in sandbox mode, verify both sender and recipient emails');
      console.error('3. Check if your account is out of the SES sandbox');
    }
  }
}

// Run the test
sendTestEmail();
