const express = require('express');
const router = express.Router();
const receiptController = require('../controllers/receiptController');

// Generate receipt for an order
router.post('/requests/:requestId/generate-receipt', receiptController.createReceipt);

// Get receipt by ID
router.get('/receipts/:id', receiptController.getReceipt);

// Get receipt by order ID
router.get('/requests/:orderId/receipt', receiptController.getReceiptByOrderId);

module.exports = router;
