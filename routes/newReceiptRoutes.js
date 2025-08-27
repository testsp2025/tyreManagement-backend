const express = require('express');
const router = express.Router();
const receiptController = require('../controllers/newReceiptController');

// Get receipt by ID
router.get('/receipts/:id', receiptController.getReceipt);

// Get receipt by order ID
router.get('/orders/:orderId/receipt', receiptController.getReceiptByOrderId);

// Create new receipt
router.post('/receipts', receiptController.createReceipt);

module.exports = router;
