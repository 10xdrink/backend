// testAwsCredentials.js
require('dotenv').config();
const { SESClient, GetSendQuotaCommand } = require('@aws-sdk/client-ses');

// Function to test AWS credentials with detailed diagnostics
async function testAwsCredentials() {
  console.log('=== AWS SES Credentials Diagnostic Tool ===');
  
  // Check environment variables
  console.log('\n1. Checking environment variables:');
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID || process.env.SMTPusername;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || process.env.SMTPpassword;
  const region = process.env.AWS_REGION || 'us-east-1';
  
  if (!accessKeyId) {
    console.error('❌ AWS Access Key ID is missing!');
    console.error('Please set AWS_ACCESS_KEY_ID or SMTPusername in your .env file');
    return false;
  } else {
    console.log(`✅ AWS Access Key ID found: ${accessKeyId.substring(0, 5)}...`);
  }
  
  if (!secretAccessKey) {
    console.error('❌ AWS Secret Access Key is missing!');
    console.error('Please set AWS_SECRET_ACCESS_KEY or SMTPpassword in your .env file');
    return false;
  } else {
    console.log('✅ AWS Secret Access Key found (hidden for security)');
  }
  
  console.log(`ℹ️ Using AWS Region: ${region}`);
  
  // Check for special characters in credentials
  console.log('\n2. Checking for special characters in credentials:');
  if (accessKeyId.includes(' ') || secretAccessKey.includes(' ')) {
    console.warn('⚠️ Warning: Credentials contain spaces which may cause issues');
  } else {
    console.log('✅ No spaces found in credentials');
  }
  
  // Create SES client with minimal configuration
  console.log('\n3. Testing AWS SES connection:');
  try {
    // Try standard configuration first
    console.log('Attempting connection with standard configuration...');
    const sesClient = new SESClient({
      region,
      credentials: {
        accessKeyId: accessKeyId.trim(),
        secretAccessKey: secretAccessKey.trim()
      }
    });
    
    // Test connection by getting send quota
    console.log('Sending test request to AWS SES...');
    const command = new GetSendQuotaCommand({});
    const response = await sesClient.send(command);
    
    console.log('\n✅ SUCCESS! AWS SES connection successful');
    console.log(`Max 24 Hour Send: ${response.Max24HourSend}`);
    console.log(`Max Send Rate: ${response.MaxSendRate}`);
    console.log(`Sent Last 24 Hours: ${response.SentLast24Hours}`);
    
    return true;
  } catch (error) {
    console.error('\n❌ AWS SES connection failed');
    console.error(`Error Message: ${error.message}`);
    
    if (error.$metadata) {
      console.error(`HTTP Status Code: ${error.$metadata.httpStatusCode}`);
      console.error(`Request ID: ${error.$metadata.requestId}`);
    }
    
    // Provide troubleshooting advice
    console.log('\n4. Troubleshooting recommendations:');
    
    if (error.message.includes('signature')) {
      console.log('- This is a signature mismatch error. Common causes:');
      console.log('  1. Incorrect AWS Secret Access Key');
      console.log('  2. System clock out of sync');
      console.log('  3. Special characters in credentials not properly handled');
      
      // Check system time
      const currentTime = new Date();
      console.log(`\nSystem time: ${currentTime.toISOString()}`);
      console.log('Ensure your system clock is synchronized with an NTP server');
      
      // Suggest updating .env file
      console.log('\nTry updating your .env file with these exact variables:');
      console.log(`
# AWS Standard Credentials (preferred)
AWS_REGION=${region}
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here

# OR Alternative SMTP-style credentials
SMTPusername=your_access_key_here
SMTPpassword=your_secret_key_here

# Email Configuration
FROM_EMAIL=your_verified_email@example.com
      `);
    } else if (error.message.includes('not authorized')) {
      console.log('- This is an authorization error. Common causes:');
      console.log('  1. The IAM user does not have permission to use SES');
      console.log('  2. The email addresses are not verified in SES sandbox mode');
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('ETIMEDOUT')) {
      console.log('- This is a network connectivity error. Common causes:');
      console.log('  1. No internet connection');
      console.log('  2. Firewall blocking AWS SES');
      console.log('  3. Incorrect endpoint or region');
    }
    
    return false;
  }
}

// Run the test
testAwsCredentials();
