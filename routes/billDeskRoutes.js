// routes/billDeskRoutes.js

const express = require('express');
const router = express.Router();

// Import the auth middleware (default export)
const protect = require('../middleware/authMiddleware');

// Import your controller methods
const {
  initializePayment,
  checkPaymentStatus,
  handlePaymentReturn,
  handleWebhook
} = require('../controllers/billDeskController');

// Protected endpoints
router.post('/initialize/:orderId', protect, initializePayment);
router.get('/status/:orderId', protect, checkPaymentStatus);

// Public callbacks from BillDesk
router.post('/return', handlePaymentReturn);
router.post('/webhook', handleWebhook);

module.exports = router;
