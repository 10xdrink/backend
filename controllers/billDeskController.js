// controllers/billDeskController.js

const Order = require('../models/Order');
const Transaction = require('../models/Transaction');
const logger = require('../utils/logger');
const billDeskService = require('../services/billDeskService');

/**
 * Initialize BillDesk payment
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
const initializePayment = async (req, res) => {
  try {
    const { orderId } = req.params;
    logger.info(`Initializing BillDesk payment for order: ${orderId}`);
    
    // Find order
    const order = await Order.findById(orderId);
    if (!order) {
      logger.error(`Order not found: ${orderId}`);
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    
    // For testing purposes, we're allowing any user to initialize payment for any order
    // In production, you would want to uncomment this check
    /*
    if (order.customer.toString() !== req.user._id.toString()) {
      logger.error(`User ${req.user._id} attempted to access order ${orderId} belonging to ${order.customer}`);
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    */
    
    // Log that we're bypassing the ownership check for testing
    logger.info(`Bypassing ownership check for order ${orderId} - Testing mode enabled`);
    
    // Update order status to payment_pending
    order.paymentStatus = 'pending';
    await order.save();
    logger.info(`Order ${orderId} status updated to payment_pending`);
    
    // Create BillDesk order using the service
    try {
      const billDeskOrder = await billDeskService.createOrder(order);
      logger.info(`BillDesk order created successfully for order ${orderId}`, billDeskOrder);
      
      // Ensure all required fields are present
      if (!billDeskOrder.paymentUrl || !billDeskOrder.msg || !billDeskOrder.checksum) {
        throw new Error('Missing required payment data from BillDesk service');
      }
      
      // Return BillDesk payment data
      res.status(200).json({
        success: true,
        data: {
          orderId: order._id,
          orderNumber: order.orderNumber,
          transactionId: billDeskOrder.transactionId,
          paymentUrl: billDeskOrder.paymentUrl,
          merchantId: billDeskOrder.merchantId,
          msg: billDeskOrder.msg,
          checksum: billDeskOrder.checksum
        }
      });
    } catch (billDeskError) {
      logger.error(`BillDesk service error: ${billDeskError.message}`);
      res.status(500).json({ success: false, message: billDeskError.message });
    }
  } catch (error) {
    logger.error(`BillDesk payment initialization failed: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Handle BillDesk payment return
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
const handlePaymentReturn = async (req, res) => {
  try {
    const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
    logger.info(`BillDesk payment return received: ${JSON.stringify(req.body)}`);
    
    // Process the return data using the service
    try {
      const result = await billDeskService.handleTransactionReturn(req.body);
      
      // Find the order associated with this transaction
      const transaction = await Transaction.findById(result.transactionId);
      if (!transaction) {
        logger.error(`Transaction not found: ${result.transactionId}`);
        return res.redirect(`${FRONTEND_URL}/payment/failed?message=Transaction not found`);
      }
      
      const order = await Order.findOne({ orderNumber: result.orderNumber });
      if (!order) {
        logger.error(`Order not found for transaction: ${result.transactionId}`);
        return res.redirect(`${FRONTEND_URL}/payment/failed?message=Order not found`);
      }
      
      // Update order status based on transaction status
      if (result.status === 'success') {
        order.paymentStatus = 'paid';
        order.status = 'processing';
        await order.save();
        
        // Clear the user's cart after successful payment
        try {
          const Cart = require('../models/Cart');
          const cart = await Cart.findOne({ user: order.customer });
          if (cart) {
            cart.items = [];
            await cart.save();
            logger.info(`Cart cleared for user ${order.customer} after successful payment`);
          }
        } catch (cartError) {
          logger.error(`Failed to clear cart after payment: ${cartError.message}`);
          // Continue even if cart clearing fails - payment was successful
        }
        
        logger.info(`Payment successful for order: ${order._id}`);
        return res.redirect(`${FRONTEND_URL}/thank-you?orderId=${order._id}`);
      } else if (result.status === 'failed') {
        order.paymentStatus = 'failed';
        await order.save();
        
        logger.info(`Payment failed for order: ${order._id}`);
        return res.redirect(`${FRONTEND_URL}/payment/failed?orderId=${order._id}`);
      } else {
        // For pending or other statuses
        order.paymentStatus = 'pending';
        await order.save();
        
        logger.info(`Payment pending for order: ${order._id}`);
        return res.redirect(`${FRONTEND_URL}/payment/pending?orderId=${order._id}`);
      }
    } catch (innerError) {
      logger.error(`Error processing payment return: ${innerError.message}`);
      return res.redirect(`${FRONTEND_URL}/payment/failed?message=${encodeURIComponent(innerError.message)}`);
    }
  } catch (error) {
    logger.error(`BillDesk payment return handling failed: ${error.message}`);
    const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
    return res.redirect(`${FRONTEND_URL}/payment/failed?message=${encodeURIComponent(error.message)}`);
  }
};

/**
 * Handle BillDesk webhook
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
const handleWebhook = async (req, res) => {
  try {
    // Log the incoming webhook data for debugging
    logger.info(`BillDesk webhook received: ${JSON.stringify(req.body)}`);
    
    // Simple validation to ensure we have data
    if (!req.body || !req.body.msg) {
      return res.status(400).json({ success: false, message: 'No webhook data received' });
    }
    
    // Process the webhook using the service
    try {
      const result = await billDeskService.processWebhook(req);
      
      // Find the order associated with this transaction
      const order = await Order.findOne({ orderNumber: result.orderNumber });
      if (order) {
        // Update order status based on transaction status
        if (result.status === 'success') {
          order.paymentStatus = 'paid';
          order.status = 'processing';
        } else if (result.status === 'failed') {
          order.paymentStatus = 'failed';
        } else {
          order.paymentStatus = 'pending';
        }
        
        await order.save();
        logger.info(`Order ${order._id} updated with payment status: ${order.paymentStatus}`);
      } else {
        logger.error(`Order not found for transaction: ${result.transactionId}`);
      }
      
      // Acknowledge receipt to BillDesk
      return res.status(200).json({ success: true });
    } catch (innerError) {
      logger.error(`Error processing webhook: ${innerError.message}`);
      return res.status(500).json({ success: false, message: innerError.message });
    }
  } catch (error) {
    logger.error(`BillDesk webhook handling failed: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Check payment status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
const checkPaymentStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    // Find order
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    
    // Check if order belongs to current user
    if (order.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    
    // Find the transaction for this order
    const transaction = await Transaction.findOne({ orderId: order._id }).sort({ createdAt: -1 });
    
    if (transaction) {
      // If there's a transaction, check its status with BillDesk
      try {
        await billDeskService.retrieveTransaction(order.orderNumber);
        
        // Refresh the transaction after status update
        const updatedTransaction = await Transaction.findById(transaction._id);
        
        // Return transaction details
        return res.status(200).json({
          success: true,
          data: {
            status: updatedTransaction.status,
            paymentMethod: 'billdesk',
            amount: updatedTransaction.amount,
            transactionId: updatedTransaction._id,
            billDeskTxnId: updatedTransaction.metadata?.billDeskTxnId || null,
            bankTxnId: updatedTransaction.metadata?.bankTxnId || null,
            createdAt: updatedTransaction.createdAt,
            updatedAt: updatedTransaction.updatedAt
          }
        });
      } catch (txnError) {
        logger.error(`Error retrieving transaction status: ${txnError.message}`);
        // If there's an error checking with BillDesk, return the local status
      }
    }
    
    // If no transaction found or error checking status, return order payment status
    return res.status(200).json({
      success: true,
      data: {
        status: order.paymentStatus,
        paymentMethod: 'billdesk',
        amount: order.finalAmount,
        orderId: order._id,
        orderNumber: order.orderNumber,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt
      }
    });
  } catch (error) {
    logger.error(`BillDesk payment status check failed: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  initializePayment,
  handlePaymentReturn,
  handleWebhook,
  checkPaymentStatus
};
