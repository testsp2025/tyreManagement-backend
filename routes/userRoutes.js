const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");

router.get("/supervisors", userController.getSupervisors);
router.get("/customer-officers", userController.getCustomerOfficers);

module.exports = router;
