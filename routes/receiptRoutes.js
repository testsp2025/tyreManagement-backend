const express = require('express');
const router = express.Router();
const {
    createReceipt,
    getReceipt,
    getAllReceipts,
    getReceiptsByCustomerOfficer,
    updateReceipt,
    deleteReceipt
} = require('../controllers/receiptController');

// Create a new receipt
router.post('/', createReceipt);

// Get a specific receipt
router.get('/:id', getReceipt);

// Get all receipts
router.get('/', getAllReceipts);

// Get receipts by customer officer
router.get('/officer/:customer_officer_id', getReceiptsByCustomerOfficer);

// Update a receipt
router.put('/:id', updateReceipt);

// Delete a receipt
router.delete('/:id', deleteReceipt);

module.exports = router;
