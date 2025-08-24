const express = require("express");
const router = express.Router();
const tireDetailsController = require("../controllers/tireDetailsController");

// Get all tire details
router.get("/", tireDetailsController.getAllTireDetails);

// Get all tire sizes only
router.get("/sizes", tireDetailsController.getAllTireSizes);

// Get tire details by tire size
router.get("/size/:tireSize", tireDetailsController.getTireDetailsBySize);

// Create new tire details
router.post("/", tireDetailsController.createTireDetails);

// Update tire details
router.put("/:id", tireDetailsController.updateTireDetails);

// Delete tire details
router.delete("/:id", tireDetailsController.deleteTireDetails);

module.exports = router;
