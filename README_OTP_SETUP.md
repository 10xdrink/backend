# SMS OTP Verification System Setup Guide

This guide provides instructions for setting up and testing the SMS OTP verification system for the 10X Website project.

## Prerequisites

1. A Twilio account with:
   - Account SID
   - Auth Token
   - Twilio phone number

## Environment Setup

1. Add the following variables to your `.env` file:

```
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
```

Make sure your Twilio phone number is in E.164 format (e.g., +15551234567).

## Testing the SMS OTP System

You can test the SMS OTP system using the provided test script:

```bash
node testTwilioSms.js
```

This script will:
1. Prompt for a phone number to send an OTP to
2. Generate and send a test OTP
3. Allow you to verify the OTP

Note: If you're using a Twilio trial account, you can only send SMS to verified phone numbers. Make sure to verify your phone number in the Twilio console first.

## API Endpoints

The SMS OTP verification system exposes the following API endpoints:

1. **Send OTP**
   - `POST /api/verification/phone/send-otp`
   - Requires authentication
   - Request body: `{ "phoneNumber": "+15551234567" }`

2. **Verify OTP**
   - `POST /api/verification/phone/verify-otp`
   - Requires authentication
   - Request body: `{ "phoneNumber": "+15551234567", "otp": "123456" }`

3. **Get Verification Status**
   - `GET /api/verification/phone/status`
   - Requires authentication

## Troubleshooting

### No SMS Received

1. Check if your Twilio account has sufficient credits
2. Verify that the phone number is in the correct format (E.164)
3. Check if the phone number is verified (required for trial accounts)
4. Check the server logs for any Twilio-specific error codes

### Authentication Issues

1. Ensure the user has a valid JWT token
2. Check if the `lastActivity` field is present in the user document
3. If you see "User not found for token" errors, verify that the user exists in the database

### Rate Limiting

There's a built-in rate limit of 5 OTP requests per hour for each phone number. If you exceed this limit, you'll need to wait before trying again.

## Partner/Influencer Users

For partner/influencer users, the system automatically updates their verification status when they successfully verify their phone number. No additional steps are required beyond the standard verification process. 