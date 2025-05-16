const crypto = require('crypto');

// YOUR body that you are sending to BillDesk
const payload = {
  merchantId: "BDUATV2APT",
  securityId: "bduatv2kaptsj",
  merchantTransactionId: "Txn_1714152458",
  amount: { currency: "INR", value: "10000" },
  returnUrl: "http://localhost:5173/payment/return",
  callbackUrl: "http://localhost:5000/api/payments/billdesk/webhook",
  device: { deviceId: "DEVICE123", ipAddress: "127.0.0.1", userAgent: "Mozilla/5.0" },
  userInfo: { mobile: "9999999999", email: "customer@example.com", firstName: "John", lastName: "Doe" },
  orderDetails: { orderId: "Order_1714152458", productName: "Test Product", productDesc: "Test description" }
};

// Convert your JSON to string
const payloadString = JSON.stringify(payload);

// Create HMAC Signature using your Signing Password
const hmac = crypto.createHmac('sha256', 'xkUzRJ8b3u2z5dmzc0wlAgPFiLQrBsbf'); // (this is your Signing Password / Checksum)
hmac.update(payloadString);

// Get the final signature
const signature = hmac.digest('base64');

// Print it
console.log('Signature for BD-Authorization header:', signature);
