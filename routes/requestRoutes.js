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

// Get deleted requests from backup
router.get("/deleted", requestController.getDeletedRequests);

// Get deleted requests for a specific user
router.get("/deleted/user/:userId", requestController.getDeletedRequestsByUser);

// Get a single deleted request by ID (must be before dynamic :id)
router.get("/deleted/:id", requestController.getDeletedRequestById);

// Get requests by user
router.get("/user/:id", requestController.getRequestsByUser);

// Check vehicle request restrictions
router.get(
  "/vehicle/:vehicleId/restrictions",
  requestController.checkVehicleRestrictions
);

// Get requests by vehicle number
router.get("/vehicle/:vehicleNumber", requestController.getRequestsByVehicleNumber);

// Update request status
router.put("/:id/status", requestController.updateRequestStatus);

// Update entire request (for editing User Requested tire requests)
router.put("/:id", requestController.updateRequest);

// Place order for an approved request
router.post("/:id/place-order", requestController.placeOrder);

// Delete a request
router.delete("/:id", requestController.deleteRequest);

// Restore a deleted request
router.post("/restore/:id", requestController.restoreDeletedRequest);

// Test endpoint for debugging soft delete
router.get("/test/backup-count", requestController.testBackupCount);

// Get a single request (keep dynamic route LAST to avoid shadowing more specific routes)
router.get("/:id", requestController.getRequestById);

module.exports = router;
