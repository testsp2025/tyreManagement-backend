const { pool } = require("../config/db");

exports.getAllSuppliers = async (req, res) => {
  try {
    const [suppliers] = await pool.query("SELECT * FROM supplier ORDER BY name");
    res.json(suppliers);
  } catch (error) {
    console.error("Error fetching suppliers:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getSupplierById = async (req, res) => {
  try {
    const [suppliers] = await pool.query("SELECT * FROM supplier WHERE id = ?", [req.params.id]);
    if (suppliers.length === 0) {
      return res.status(404).json({ error: "Supplier not found" });
    }
    res.json(suppliers[0]);
  } catch (error) {
    console.error("Error fetching supplier:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.createSupplier = async (req, res) => {
  try {
    const { name, email, phone, formsfree_key } = req.body;
    
    if (!name || !email || !formsfree_key) {
      return res.status(400).json({ error: "Name, email, and formsfree_key are required" });
    }

    const [result] = await pool.query(
      "INSERT INTO supplier (name, email, phone, formsfree_key) VALUES (?, ?, ?, ?)",
      [name, email, phone, formsfree_key]
    );

    const [newSupplier] = await pool.query("SELECT * FROM supplier WHERE id = ?", [result.insertId]);
    res.status(201).json(newSupplier[0]);
  } catch (error) {
    console.error("Error creating supplier:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.updateSupplier = async (req, res) => {
  try {
    const { name, email, phone, formsfree_key } = req.body;
    
    const [result] = await pool.query(
      "UPDATE supplier SET name = ?, email = ?, phone = ?, formsfree_key = ? WHERE id = ?",
      [name, email, phone, formsfree_key, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Supplier not found" });
    }

    const [updatedSupplier] = await pool.query("SELECT * FROM supplier WHERE id = ?", [req.params.id]);
    res.json(updatedSupplier[0]);
  } catch (error) {
    console.error("Error updating supplier:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.deleteSupplier = async (req, res) => {
  try {
    const [result] = await pool.query("DELETE FROM supplier WHERE id = ?", [req.params.id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Supplier not found" });
    }

    res.json({ message: "Supplier deleted successfully" });
  } catch (error) {
    console.error("Error deleting supplier:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
