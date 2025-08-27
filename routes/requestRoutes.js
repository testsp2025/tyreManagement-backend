const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const requestController = require("../controllers/requestController");

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "../uploads"));
  },
  filename: function (req, file, cb) {
    // Use Date.now() to make filename unique
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});
const upload = multer({ storage: storage });

// Create a new request (with file uploads)
router.post("/", upload.array("images", 7), requestController.createRequest);

// Create a new request (alternative route)
router.post("/requests", requestController.createRequest);

// Get all requests
router.get("/", requestController.getAllRequests);

// Get a single request
router.get("/:id", requestController.getRequestById);

// Update request status
router.put("/:id/status", requestController.updateRequestStatus);

// Update entire request (for editing pending requests)
router.put("/:id", requestController.updateRequest);

// Get requests by user
router.get("/user/:id", requestController.getRequestsByUser);

// Check vehicle request restrictions
router.get(
  "/vehicle/:vehicleId/restrictions",
  requestController.checkVehicleRestrictions
);

// Place order for an approved request
router.post("/:id/place-order", requestController.placeOrder);

// Delete a request
router.delete("/:id", requestController.deleteRequest);

// Get requests by vehicle number
router.get("/vehicle/:vehicleNumber", requestController.getRequestsByVehicleNumber);

// Get receipt for an order
router.get("/:orderId/receipt", async (req, res) => {
  try {
    console.log('Fetching receipt for order:', req.params.orderId);
    const { ReceiptModel } = require('../models/Receipt');
    const Request = require('../models/Request');

    // Find receipt by order ID
    const receipt = await ReceiptModel.findOne({
      where: { order_id: req.params.orderId }
    });

    if (!receipt) {
      console.log('Receipt not found for order:', req.params.orderId);
      return res.status(404).json({ message: 'Receipt not found' });
    }

    // Get the related request to get additional details
    const request = await Request.findByPk(receipt.order_id);
    if (!request) {
      console.log('Related request not found for order:', req.params.orderId);
      return res.status(404).json({ message: 'Related request not found' });
    }

    // Format receipt data for frontend
    const formattedReceipt = {
      id: receipt.id.toString(),
      orderId: receipt.order_id.toString(),
      requestId: receipt.order_id.toString(),
      receiptNumber: receipt.receipt_number,
      dateGenerated: receipt.created_at,
      totalAmount: Number(receipt.total_amount),
      customerOfficerId: request.customer_officer_decision_by || '',
      customerOfficerName: receipt.customer_name,
      vehicleNumber: receipt.vehicle_number,
      vehicleBrand: request.vehicleBrand,
      vehicleModel: request.vehicleModel,
      supplierDetails: {
        name: receipt.supplier_name,
        email: request.supplier_email || '',
        phone: request.supplier_phone || '',
        address: request.supplier_address || ''
      },
      items: [{
        description: `${request.tireSizeRequired} Tires`,
        quantity: request.quantity,
        unitPrice: Number(request.totalPrice) / request.quantity,
        total: Number(request.totalPrice),
        itemDetails: {
          tireSize: request.tireSizeRequired,
          brand: request.existingTireMake
        }
      }],
      subtotal: Number(request.totalPrice),
      tax: Number(request.totalPrice) * 0.12, // 12% tax
      discount: 0,
      paymentMethod: 'Corporate Account',
      paymentStatus: 'Paid',
      notes: request.customer_officer_note || '',
      companyDetails: {
        name: 'CPC Tire Management',
        address: '123 Corporate Drive, Colombo',
        phone: '+94 11 234 5678',
        email: 'tiremanagement@cpc.lk',
        website: 'https://www.cpc.lk',
        logo: '/company-logo.png'
      }
    };

    // If tubes were ordered, add them as a separate item
    if (request.tubesQuantity > 0) {
      formattedReceipt.items.push({
        description: 'Tire Tubes',
        quantity: request.tubesQuantity,
        unitPrice: 0,
        total: 0,
        itemDetails: {
          tireSize: request.tireSizeRequired
        }
      });
    }

    console.log('Sending formatted receipt:', formattedReceipt);
    res.json(formattedReceipt);
  } catch (error) {
    console.error('Error fetching receipt:', error);
    res.status(500).json({ message: 'Error fetching receipt', error: error.message });
  }
});

module.exports = router;
