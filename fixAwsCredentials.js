// fixAwsCredentials.js
require('dotenv').config();
const { SESClient, GetSendQuotaCommand } = require('@aws-sdk/client-ses');
const fs = require('fs');
const readline = require('readline');

// Function to test AWS credentials and fix .env file if needed
async function fixAwsCredentials() {
  console.log('=== AWS SES Credentials Fix Tool ===');
  
  // Get current credentials from environment
  const currentAccessKey = process.env.AWS_ACCESS_KEY_ID || process.env.SMTPusername || '';
  const currentSecretKey = process.env.AWS_SECRET_ACCESS_KEY || process.env.SMTPpassword || '';
  const currentFromEmail = process.env.FROM_EMAIL || process.env.SUPPORT_EMAIL || '';
  
  // Create readline interface for user input
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  // Prompt for AWS credentials
  console.log('\nPlease enter your AWS credentials:');
  
  // Function to ask questions and get user input
  const question = (query) => new Promise((resolve) => rl.question(query, resolve));
  
  try {
    // Get AWS Access Key
    const accessKeyId = await question(`AWS Access Key ID [${currentAccessKey ? currentAccessKey.substring(0, 5) + '...' : 'not set'}]: `);
    const finalAccessKey = accessKeyId.trim() || currentAccessKey;
    
    // Get AWS Secret Key
    const secretAccessKey = await question('AWS Secret Access Key (press Enter to keep current if set): ');
    const finalSecretKey = secretAccessKey.trim() || currentSecretKey;
    
    // Get From Email
    const fromEmail = await question(`From Email [${currentFromEmail || 'not set'}]: `);
    const finalFromEmail = fromEmail.trim() || currentFromEmail;
    
    // Test the credentials
    console.log('\nTesting AWS SES connection with provided credentials...');
    
    // Create SES client with provided credentials
    const sesClient = new SESClient({
      region: 'us-east-1', // Hardcoded to us-east-1 which is common for SES
      credentials: {
        accessKeyId: finalAccessKey,
        secretAccessKey: finalSecretKey
      }
    });
    
    try {
      // Test connection by getting send quota
      const command = new GetSendQuotaCommand({});
      const response = await sesClient.send(command);
      
      console.log('\n✅ SUCCESS! AWS SES connection successful');
      console.log(`Max 24 Hour Send: ${response.Max24HourSend}`);
      console.log(`Max Send Rate: ${response.MaxSendRate}`);
      console.log(`Sent Last 24 Hours: ${response.SentLast24Hours}`);
      
      // Update .env file with working credentials
      const envPath = './.env';
      let envContent = '';
      
      try {
        // Read existing .env file if it exists
        if (fs.existsSync(envPath)) {
          envContent = fs.readFileSync(envPath, 'utf8');
        }
        
        // Update or add AWS credentials
        const envLines = envContent.split('\n');
        const newEnvLines = [];
        let awsAccessKeyUpdated = false;
        let awsSecretKeyUpdated = false;
        let fromEmailUpdated = false;
        
        // Update existing lines
        for (const line of envLines) {
          if (line.startsWith('AWS_ACCESS_KEY_ID=') || line.startsWith('SMTPusername=')) {
            if (!awsAccessKeyUpdated) {
              newEnvLines.push(`AWS_ACCESS_KEY_ID=${finalAccessKey}`);
              newEnvLines.push(`SMTPusername=${finalAccessKey}`);
              awsAccessKeyUpdated = true;
            }
          } else if (line.startsWith('AWS_SECRET_ACCESS_KEY=') || line.startsWith('SMTPpassword=')) {
            if (!awsSecretKeyUpdated) {
              newEnvLines.push(`AWS_SECRET_ACCESS_KEY=${finalSecretKey}`);
              newEnvLines.push(`SMTPpassword=${finalSecretKey}`);
              awsSecretKeyUpdated = true;
            }
          } else if (line.startsWith('FROM_EMAIL=')) {
            if (!fromEmailUpdated) {
              newEnvLines.push(`FROM_EMAIL=${finalFromEmail}`);
              fromEmailUpdated = true;
            }
          } else {
            newEnvLines.push(line);
          }
        }
        
        // Add missing variables
        if (!awsAccessKeyUpdated) {
          newEnvLines.push(`AWS_ACCESS_KEY_ID=${finalAccessKey}`);
          newEnvLines.push(`SMTPusername=${finalAccessKey}`);
        }
        
        if (!awsSecretKeyUpdated) {
          newEnvLines.push(`AWS_SECRET_ACCESS_KEY=${finalSecretKey}`);
          newEnvLines.push(`SMTPpassword=${finalSecretKey}`);
        }
        
        if (!fromEmailUpdated && finalFromEmail) {
          newEnvLines.push(`FROM_EMAIL=${finalFromEmail}`);
        }
        
        // Add AWS region
        newEnvLines.push('AWS_REGION=us-east-1');
        
        // Write updated .env file
        fs.writeFileSync(envPath, newEnvLines.join('\n'));
        console.log('\n✅ .env file updated successfully with working credentials');
        
      } catch (error) {
        console.error(`\n❌ Error updating .env file: ${error.message}`);
        console.log('Please manually update your .env file with the following:');
        console.log(`
# AWS Credentials
AWS_ACCESS_KEY_ID=${finalAccessKey}
AWS_SECRET_ACCESS_KEY=${finalSecretKey}
AWS_REGION=us-east-1
SMTPusername=${finalAccessKey}
SMTPpassword=${finalSecretKey}
FROM_EMAIL=${finalFromEmail}
        `);
      }
      
    } catch (error) {
      console.error('\n❌ AWS SES connection failed');
      console.error(`Error Message: ${error.message}`);
      
      if (error.$metadata) {
        console.error(`HTTP Status Code: ${error.$metadata.httpStatusCode}`);
        console.error(`Request ID: ${error.$metadata.requestId}`);
      }
      
      console.log('\nPlease check your AWS credentials and try again.');
    }
    
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
  } finally {
    rl.close();
  }
}

// Run the fix tool
fixAwsCredentials();
