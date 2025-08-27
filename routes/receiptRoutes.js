const express = require('express');
const router = express.Router();
const receiptController = require('../controllers/receiptController');

// Generate a receipt for an order/request
router.post('/generate/:orderId', receiptController.generateReceipt);

// Get receipt by id or receipt number
router.get('/:receiptId', receiptController.getReceipt);

module.exports = router;
