// services/billDeskService.js

const crypto = require('crypto');
const logger = require('../utils/logger');
const Transaction = require('../models/Transaction');

// BillDesk API configuration
const BILLDESK_CONFIG = {
  // Core credentials
  merchantId: process.env.BILLDESK_MERCHANT_ID || 'BDUATV2APT',
  clientId: process.env.BILLDESK_CLIENT_ID || 'bduatv2kaptsj',
  keyId: process.env.BILLDESK_KEY_ID || '88lAHZxdSyXM',
  encryptionPassword: process.env.BILLDESK_ENCRYPTION_PASSWORD || '4u4akYDyOojgMwgU8xr464yOMmtM2cPe',
  signingPassword: process.env.BILLDESK_SIGNING_PASSWORD || 'xkUzRJ8b3u2z5dmzc0wlAgPFiLQrBsbf',
  
  // URLs - Using both localhost and ngrok URLs to support both environments
  // The frontend will use window.location.origin to determine the correct return URL
  returnUrl: process.env.BILLDESK_RETURN_URL || 'https://54cd-2409-40f0-11da-bc46-19f2-c574-b602-3639.ngrok-free.app/payment/return',
  localReturnUrl: 'http://localhost:5173/payment/return',
  webhookUrl: process.env.BILLDESK_WEBHOOK_URL || 'https://54cd-2409-40f0-11da-bc46-19f2-c574-b602-3639.ngrok-free.app/api/payments/billdesk/webhook',
  
  // API endpoints
  paymentUrl: 'https://uat1.billdesk.com/u2/web/v1_2/embeddedsdk',
  sdkJsUrl: 'https://uat1.billdesk.com/u2/assets/js/billdesksdk.js',
  
  // SDK Configuration
  flowType: 'payments',
  crossButtonHandling: 'Y'
};

// Log the configuration (with sensitive data masked)
logger.info('BillDesk Configuration:');
logger.info(`- Merchant ID: ${BILLDESK_CONFIG.merchantId}`);
logger.info(`- Payment URL: ${BILLDESK_CONFIG.paymentUrl}`);
logger.info(`- Return URL: ${BILLDESK_CONFIG.returnUrl}`);
logger.info(`- Webhook URL: ${BILLDESK_CONFIG.webhookUrl}`);

/**
 * Generates a unique trace ID for request tracking
 * @returns {string} - Trace ID
 */
const generateTraceId = () => {
  return `TRC-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
};

/**
 * Creates a BillDesk order
 * @param {Object} order - Order object from database
 * @returns {Promise<Object>} - BillDesk order response
 */
const createOrder = async (order) => {
  try {
    logger.info('Creating BillDesk order');
    
    // Get the amount from the order - ensure we get the correct amount field
    const orderAmount = order.finalAmount || order.totalAmount || order.amount || 0;
    
    logger.info(`Using order amount: ${orderAmount}`);
    
    // Strict validation to ensure we have a valid, positive amount
    if (!orderAmount || isNaN(orderAmount) || orderAmount <= 0) {
      logger.error(`Invalid order amount: ${orderAmount}`);
      throw new Error('Invalid order amount. Amount must be greater than zero.');
    }
    
    const { orderNumber, customer } = order;
    
    // Generate a unique reference ID (order ID in your system)
    const bdOrderId = orderNumber || `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // Get customer details
    let customerName = 'Customer';
    let customerEmail = 'customer@example.com';
    let customerPhone = '1234567890';
    
    // If there's a customer ID on the order, try to get their details
    if (customer) {
      try {
        // Assuming you have a User model or similar to fetch customer details
        const User = require('../models/User');
        const customerDetails = await User.findById(customer);
        
        if (customerDetails) {
          customerName = customerDetails.name || customerName;
          customerEmail = customerDetails.email || customerEmail;
          customerPhone = customerDetails.phone || customerPhone;
        }
      } catch (err) {
        logger.warn('Error fetching customer details, using defaults:', err.message);
      }
    }
    
    // Create the message string according to BillDesk specifications
    const msg = constructMessage(bdOrderId, orderAmount, customerName, customerEmail, customerPhone);
    
    // Generate checksum for the message
    const checksum = generateChecksum(msg);
    
    // Create a transaction record
    const transaction = new Transaction({
      order: order._id,  // Reference to the Order document
      orderNumber: bdOrderId,
      amount: orderAmount,
      currency: 'INR',
      paymentMethod: 'billdesk',
      status: 'pending',
      metadata: {
        billDeskOrderId: bdOrderId,
        billDeskTxnId: `TXN${Date.now()}`,
        msg: msg,
        checksum: checksum
      }
    });
    
    await transaction.save();
    logger.info(`Transaction record created with ID: ${transaction._id}`);
    
    // For BillDesk embedded SDK, we need to provide the message and checksum
    // The frontend will use these to submit the form to BillDesk
    return {
      success: true,
      orderId: order._id,
      orderNumber: bdOrderId,
      merchantId: BILLDESK_CONFIG.merchantId,
      msg: msg,
      checksum: checksum,
      paymentUrl: BILLDESK_CONFIG.paymentUrl,
      transactionId: transaction._id
    };
  } catch (error) {
    logger.error('Error creating BillDesk order:', error);
    throw new Error(`Failed to create BillDesk order: ${error.message}`);
  }
};






function constructMessage(refId, amount, customerName, customerEmail, customerPhone) {
  // Format amount to 2 decimal places without decimal point (e.g., 100.00 -> 10000)
  if (amount === undefined || amount === null || isNaN(amount)) {
    logger.error(`Invalid amount provided: ${amount}`);
    throw new Error('Invalid amount for BillDesk payment');
  }
  
  // Format amount as integer in paise (multiply by 100 and remove decimal)
  const formattedAmount = Math.round(parseFloat(amount) * 100).toString();
  
  logger.info('Formatting amount:', formattedAmount);
  
  // Ensure customer details are properly formatted - no spaces allowed
  const sanitizedCustomerName = (customerName || 'Customer').trim().replace(/\s+/g, ' ');
  const sanitizedCustomerEmail = (customerEmail || 'customer@example.com').trim();
  const sanitizedCustomerPhone = (customerPhone || '1234567890').trim().replace(/\D/g, '');
  
  // Create message according to BillDesk embedded SDK specifications
  // IMPORTANT: Order of parameters must match exactly what BillDesk expects
  const messageComponents = [
    BILLDESK_CONFIG.merchantId,  // Merchant ID
    refId,                       // Reference ID (your order ID)
    formattedAmount,             // Amount in lowest denomination (paise)
    'INR',                       // Currency
    sanitizedCustomerName,       // Customer name
    sanitizedCustomerEmail,      // Customer email
    sanitizedCustomerPhone,      // Customer phone
    BILLDESK_CONFIG.returnUrl,   // Return URL
    'DIRECT'                     // Payment mode
  ];
  
  const message = messageComponents.join('|');
  logger.info('Message components:', messageComponents);
  logger.info('Final message:', message);
  
  return message;
}

function generateChecksum(msg) {
  try {
    logger.info('Generating checksum for message');
    
    // BillDesk's documentation specifies to use HMAC-SHA256 with the signing password
    const hmac = crypto.createHmac('sha256', BILLDESK_CONFIG.signingPassword);
    hmac.update(msg); // Use the msg parameter that was passed to the function
    const checksum = hmac.digest('hex').toLowerCase(); // BillDesk expects lowercase hex
    
    logger.debug('Message for checksum:', msg);
    logger.debug('Checksum generated:', checksum);
    
    return checksum;
  } catch (error) {
    logger.error('Error generating checksum:', error);
    throw new Error('Failed to generate checksum for BillDesk payment');
  }
}

/**
 * Retrieves transaction status from BillDesk
 * @param {string} orderNumber - Order Number
 * @returns {Promise<Object>} - Transaction status
 */
function retrieveTransaction(orderNumber) {
  try {
    logger.info(`Retrieving transaction status for order: ${orderNumber}`);
    
    // Find the transaction in the database
    return Transaction.findOne({ orderNumber }).populate('order')
      .then(transaction => {
        if (!transaction) {
          logger.error(`Transaction not found for order: ${orderNumber}`);
          throw new Error(`Transaction not found for order: ${orderNumber}`);
        }
        
        // Create a transaction status response
        return {
          success: true,
          transaction: {
            id: transaction._id,
            orderNumber: transaction.orderNumber,
            amount: transaction.amount,
            currency: transaction.currency,
            status: transaction.status,
            billDeskOrderId: transaction.metadata?.billDeskOrderId,
            billDeskTxnId: transaction.metadata?.billDeskTxnId,
            createdAt: transaction.createdAt,
            updatedAt: transaction.updatedAt
          }
        };
      });
  } catch (error) {
    logger.error(`Error retrieving transaction: ${error.message}`);
    throw new Error(`Failed to retrieve transaction: ${error.message}`);
  }
}

/**
 * Processes BillDesk webhook
 * @param {Object} req - Express request object
 * @returns {Promise<Object>} - Processed webhook data
 */
async function processWebhook(req) {
  try {
    // Log the incoming webhook data for debugging
    logger.info(`BillDesk webhook received: ${JSON.stringify(req.body)}`);
    
    // Simple validation to ensure we have data
    if (!req.body || !req.body.msg) {
      throw new Error('No webhook data received');
    }
    
    // Parse the response - BillDesk sends a pipe-delimited string
    // Format: MerchantID|OrderID|TxnStatus|BillDeskTxnID|BankTxnID|TxnAmount|BankID|AuthStatus|TxnType|Currency|AdditionalInfo1|AdditionalInfo2|AdditionalInfo3|AdditionalInfo4|AdditionalInfo5|AdditionalInfo6|AdditionalInfo7|ErrorStatus|ErrorDescription|Checksum
    const responseData = req.body.msg;
    const responseFields = responseData.split('|');
    
    // Verify response checksum
    const receivedChecksum = responseFields[responseFields.length - 1];
    const dataToVerify = responseFields.slice(0, -1).join('|');
    const checksumToVerify = dataToVerify + '|' + BILLDESK_CONFIG.checksum;
    const calculatedChecksum = crypto.createHash('sha256').update(checksumToVerify).digest('hex');
    
    if (receivedChecksum !== calculatedChecksum) {
      logger.error('Invalid checksum in BillDesk webhook');
      throw new Error('Invalid checksum in webhook');
    }
    
    const merchantId = responseFields[0];
    const orderNumber = responseFields[1];
    const txnStatus = responseFields[2];
    const billDeskTxnId = responseFields[3];
    const bankTxnId = responseFields[4];
    const txnAmount = responseFields[5];
    
    // Validate merchant ID
    if (merchantId !== BILLDESK_CONFIG.merchantId) {
      logger.error(`Invalid merchant ID in webhook: ${merchantId}`);
      throw new Error('Invalid merchant ID in webhook');
    }
    
    // Find the transaction in our database
    const transaction = await Transaction.findOne({ orderNumber: orderNumber });
    
    if (!transaction) {
      logger.error(`Transaction not found for order number: ${orderNumber}`);
      throw new Error('Transaction not found');
    }
    
    // Update transaction status based on BillDesk response
    let status = 'pending';
    
    if (txnStatus === '0300') {
      status = 'success';
    } else if (txnStatus === '0399') {
      status = 'failed';
    } else if (txnStatus === '0002') {
      status = 'pending';
    } else {
      status = 'failed';
    }
    
    transaction.status = status;
    transaction.metadata = {
      ...transaction.metadata,
      billDeskResponse: responseData,
      billDeskTxnId: billDeskTxnId,
      bankTxnId: bankTxnId,
      txnAmount: txnAmount,
      authStatus: responseFields[7],
      errorStatus: responseFields[17],
      errorDescription: responseFields[18]
    };
    
    await transaction.save();
    logger.info(`Transaction status updated to ${status} for order: ${orderNumber}`);
    
    return { 
      success: true,
      orderNumber,
      status,
      transactionId: transaction._id
    };
  } catch (error) {
    logger.error(`BillDesk webhook processing failed: ${error.message}`);
    throw new Error(`BillDesk webhook processing failed: ${error.message}`);
  }
};

/**
 * Handles BillDesk transaction status from return URL
 * @param {Object} returnData - Return data from BillDesk
 * @returns {Promise<Object>} - Updated transaction status
 */
async function handleTransactionReturn(returnData) {
  try {
    // Log return data
    logger.info(`Processing BillDesk return data: ${JSON.stringify(returnData)}`);
    
    if (!returnData || !returnData.msg) {
      throw new Error('No return data received');
    }
    
    // Parse the response - BillDesk sends a pipe-delimited string
    const responseData = returnData.msg;
    const responseFields = responseData.split('|');
    
    // Verify response checksum
    const receivedChecksum = responseFields[responseFields.length - 1];
    const dataToVerify = responseFields.slice(0, -1).join('|');
    const checksumToVerify = dataToVerify + '|' + BILLDESK_CONFIG.checksum;
    const calculatedChecksum = crypto.createHash('sha256').update(checksumToVerify).digest('hex');
    
    if (receivedChecksum !== calculatedChecksum) {
      logger.error('Invalid checksum in BillDesk return data');
      throw new Error('Invalid checksum in return data');
    }
    
    const merchantId = responseFields[0];
    const orderNumber = responseFields[1];
    const txnStatus = responseFields[2];
    
    // Validate merchant ID
    if (merchantId !== BILLDESK_CONFIG.merchantId) {
      logger.error(`Invalid merchant ID in return data: ${merchantId}`);
      throw new Error('Invalid merchant ID in return data');
    }
    
    // Find the transaction in our database
    const transaction = await Transaction.findOne({ orderNumber: orderNumber });
    
    if (!transaction) {
      logger.error(`Transaction not found for order number: ${orderNumber}`);
      throw new Error('Transaction not found');
    }
    
    // Update transaction status based on BillDesk response
    let status = 'pending';
    
    if (txnStatus === '0300') {
      status = 'success';
    } else if (txnStatus === '0399') {
      status = 'failed';
    } else if (txnStatus === '0002') {
      status = 'pending';
    } else {
      status = 'failed';
    }
    
    transaction.status = status;
    transaction.metadata = {
      ...transaction.metadata,
      billDeskResponse: responseData,
      billDeskTxnId: responseFields[3] || '',
      bankTxnId: responseFields[4] || '',
      txnAmount: responseFields[5] || '',
      authStatus: responseFields[7] || '',
      errorStatus: responseFields[17] || '',
      errorDescription: responseFields[18] || ''
    };
    
    await transaction.save();
    logger.info(`Transaction status updated to ${status} for order: ${orderNumber}`);
    
    return { 
      success: true,
      orderNumber,
      status,
      transactionId: transaction._id
    };
  } catch (error) {
    logger.error(`BillDesk return data handling failed: ${error.message}`);
    throw new Error(`BillDesk return data handling failed: ${error.message}`);
  }
};

module.exports = {
  createOrder,
  retrieveTransaction,
  processWebhook,
  handleTransactionReturn,
  BILLDESK_CONFIG
};
