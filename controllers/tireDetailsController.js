const TireDetails = require("../models/TireDetails");

// Get all tire details
exports.getAllTireDetails = async (req, res) => {
  try {
    const tireDetails = await TireDetails.findAll({
      order: [["tire_size", "ASC"]],
    });
    res.json(tireDetails);
  } catch (error) {
    console.error("Error fetching tire details:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get tire details by tire size
exports.getTireDetailsBySize = async (req, res) => {
  try {
    const { tireSize } = req.params;
    const tireDetail = await TireDetails.findOne({
      where: { tire_size: tireSize },
    });

    if (!tireDetail) {
      return res
        .status(404)
        .json({ error: "Tire details not found for this size" });
    }

    res.json(tireDetail);
  } catch (error) {
    console.error("Error fetching tire details by size:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get all unique tire sizes
exports.getAllTireSizes = async (req, res) => {
  try {
    const tireSizes = await TireDetails.findAll({
      attributes: ["tire_size"],
      order: [["tire_size", "ASC"]],
    });

    const sizes = tireSizes.map((item) => item.tire_size);
    res.json(sizes);
  } catch (error) {
    console.error("Error fetching tire sizes:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Create new tire details
exports.createTireDetails = async (req, res) => {
  try {
    const { tire_size, tire_brand, total_price, warranty_distance } = req.body;

    const tireDetails = await TireDetails.create({
      tire_size,
      tire_brand,
      total_price,
      warranty_distance,
    });

    res.status(201).json(tireDetails);
  } catch (error) {
    console.error("Error creating tire details:", error);
    if (error.name === "SequelizeUniqueConstraintError") {
      res.status(400).json({ error: "Tire size already exists" });
    } else {
      res.status(500).json({ error: "Internal server error" });
    }
  }
};

// Update tire details
exports.updateTireDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const { tire_size, tire_brand, total_price, warranty_distance } = req.body;

    const [updatedRowsCount] = await TireDetails.update(
      { tire_size, tire_brand, total_price, warranty_distance },
      { where: { id: id } }
    );

    if (updatedRowsCount === 0) {
      return res.status(404).json({ error: "Tire details not found" });
    }

    const updatedTireDetails = await TireDetails.findByPk(id);
    res.json(updatedTireDetails);
  } catch (error) {
    console.error("Error updating tire details:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Delete tire details
exports.deleteTireDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedRowsCount = await TireDetails.destroy({
      where: { id: id },
    });

    if (deletedRowsCount === 0) {
      return res.status(404).json({ error: "Tire details not found" });
    }

    res.json({ message: "Tire details deleted successfully" });
  } catch (error) {
    console.error("Error deleting tire details:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
