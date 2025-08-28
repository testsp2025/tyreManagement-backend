const Receipt = require("../models/Receipt");
const { Request } = require("../models");

exports.createReceipt = async (req, res) => {
  try {
    const {
      order_id,
      total_amount,
      vehicle_number,
      request_id,
      customer_officer_id,
      customer_officer_name,
      vehicle_brand,
      vehicle_model,
      items,
      notes,
      supplier_name,
      supplier_email,
      supplier_phone,
      submitted_date,
      order_placed_date,
      order_number
    } = req.body;

    // Generate unique receipt number (YYYYMMDD-XXXX format)
    const date = new Date();
    const datePart = date.toISOString().slice(0, 10).replace(/-/g, '');
    const randomPart = Math.floor(1000 + Math.random() * 9000);
    const receipt_number = `${datePart}-${randomPart}`;

    const receipt = await Receipt.create({
      order_id,
      receipt_number,
      total_amount,
      vehicle_number,
      request_id,
      customer_officer_id,
      customer_officer_name,
      vehicle_brand,
      vehicle_model,
      items,
      notes,
      supplier_name,
      supplier_email,
      supplier_phone,
      submitted_date,
      order_placed_date,
      order_number
    });

    res.status(201).json({
      success: true,
      data: receipt
    });
  } catch (error) {
    console.error("Error creating receipt:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create receipt"
    });
  }
};

exports.getReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    const receipt = await Receipt.findByPk(id, {
      include: [{
        model: Request,
        attributes: ['status', 'description']
      }]
    });

    if (!receipt) {
      return res.status(404).json({
        success: false,
        error: "Receipt not found"
      });
    }

    res.status(200).json({
      success: true,
      data: receipt
    });
  } catch (error) {
    console.error("Error fetching receipt:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch receipt"
    });
  }
};

exports.getAllReceipts = async (req, res) => {
  try {
    const receipts = await Receipt.findAll({
      include: [{
        model: Request,
        attributes: ['status', 'description']
      }],
      order: [['created_at', 'DESC']]
    });

    res.status(200).json({
      success: true,
      data: receipts
    });
  } catch (error) {
    console.error("Error fetching receipts:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch receipts"
    });
  }
};

exports.getReceiptsByCustomerOfficer = async (req, res) => {
  try {
    const { customer_officer_id } = req.params;
    const receipts = await Receipt.findAll({
      where: { customer_officer_id },
      include: [{
        model: Request,
        attributes: ['status', 'description']
      }],
      order: [['created_at', 'DESC']]
    });

    res.status(200).json({
      success: true,
      data: receipts
    });
  } catch (error) {
    console.error("Error fetching receipts:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch receipts"
    });
  }
};

exports.updateReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    const receipt = await Receipt.findByPk(id);

    if (!receipt) {
      return res.status(404).json({
        success: false,
        error: "Receipt not found"
      });
    }

    const updatedReceipt = await receipt.update(req.body);

    res.status(200).json({
      success: true,
      data: updatedReceipt
    });
  } catch (error) {
    console.error("Error updating receipt:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update receipt"
    });
  }
};

exports.deleteReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    const receipt = await Receipt.findByPk(id);

    if (!receipt) {
      return res.status(404).json({
        success: false,
        error: "Receipt not found"
      });
    }

    await receipt.destroy();

    res.status(200).json({
      success: true,
      message: "Receipt deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting receipt:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete receipt"
    });
  }
};
