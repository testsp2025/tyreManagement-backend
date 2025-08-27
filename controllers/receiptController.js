const { pool } = require("../config/db");

// Helper to generate a unique receipt number
function generateReceiptNumber() {
  const now = new Date();
  const ts = now.toISOString().replace(/[-:.TZ]/g, "");
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `RCT-${ts}-${rand}`;
}

exports.generateReceipt = async (req, res) => {
  try {
    const { orderId } = req.params; // orderId expected to be request id or order id

    // Try to fetch request details
    const [requests] = await pool.query("SELECT * FROM requests WHERE id = ?", [orderId]);
    if (!requests || requests.length === 0) {
      return res.status(404).json({ error: "Request / Order not found" });
    }
    const request = requests[0];

    // Fetch supplier details if available on request
    const supplierName = request.supplierName || '';
    const supplierEmail = request.supplierEmail || '';
    const supplierPhone = request.supplierPhone || '';

    // Build receipt values
    const receiptNumber = generateReceiptNumber();
    const subtotal = Number(request.totalPrice) || 0;
    const tax = 0.0; // default; tax calc can be enhanced later
    const discount = 0.0;
    const totalAmount = subtotal + tax - discount;
    const customerOfficerId = request.customer_officer_decision_by || null;
    const customerOfficerName = request.customer_officer_name || request.customerOfficerName || '';

    // Insert receipt
    const insertReceiptQuery = `
      INSERT INTO receipts (
        receipt_number, order_id, request_id, date_generated, total_amount,
        customer_officer_id, customer_officer_name, vehicle_number, vehicle_brand, vehicle_model,
        supplier_name, supplier_email, supplier_phone, subtotal, tax, discount, payment_status, notes, created_at, updated_at
      ) VALUES (?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`;

    let receiptId = null;
    const [result] = await pool.query(insertReceiptQuery, [
      receiptNumber,
      request.orderNumber || null,
      request.id,
      totalAmount,
      customerOfficerId,
      customerOfficerName,
      request.vehicleNumber,
      request.vehicleBrand,
      request.vehicleModel,
      supplierName,
      supplierEmail,
      supplierPhone,
      subtotal,
      tax,
      discount,
      'unpaid',
      null
    ]);

    // Read insertId (MySQL)
    if (result && result.insertId) {
      receiptId = result.insertId;
    } else if (Array.isArray(result) && result[0] && result[0].id) {
      receiptId = result[0].id;
    }

    // Insert a default line item for the tires
    if (receiptId) {
      const qty = Number(request.quantity) || 1;
      const unitPrice = subtotal && qty > 0 ? Number((subtotal / qty).toFixed(2)) : subtotal;
      const itemTotal = Number((unitPrice * qty).toFixed(2));
      await pool.query(`
        INSERT INTO receipt_items (
          receipt_id, description, quantity, unit_price, total, tire_size, tire_brand, tire_model, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, [
        receiptId,
        `Tires - ${request.tireSize || request.tireSizeRequired || ''}`,
        qty,
        unitPrice,
        itemTotal,
        request.tireSize || null,
        request.vehicleBrand || null,
        request.vehicleModel || null
      ]);
    }

    // Return the created receipt
    const [created] = await pool.query("SELECT * FROM receipts WHERE id = ?", [receiptId]);
    const [items] = await pool.query("SELECT * FROM receipt_items WHERE receipt_id = ?", [receiptId]);

    res.json({ receipt: created[0], items });
  } catch (error) {
    console.error("Error generating receipt:", error);
    res.status(500).json({ error: "Failed to generate receipt", details: error.message });
  }
};

exports.getReceipt = async (req, res) => {
  try {
    const { receiptId } = req.params;
    const [receipts] = await pool.query("SELECT * FROM receipts WHERE id = ? OR receipt_number = ?", [receiptId, receiptId]);
    if (!receipts || receipts.length === 0) return res.status(404).json({ error: "Receipt not found" });
    const receipt = receipts[0];
    const [items] = await pool.query("SELECT * FROM receipt_items WHERE receipt_id = ?", [receipt.id]);
    res.json({ ...receipt, items });
  } catch (error) {
    console.error("Error fetching receipt:", error);
    res.status(500).json({ error: "Failed to fetch receipt" });
  }
};
