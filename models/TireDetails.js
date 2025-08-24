const { sequelize } = require("../config/db");
const { DataTypes } = require("sequelize");

const TireDetails = sequelize.define(
  "TireDetails",
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    tire_size: {
      type: DataTypes.STRING(100), // was DataTypes.TEXT
      allowNull: true,
    },
    tire_brand: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    total_price: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    warranty_distance: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    tableName: "tiredetails",
    timestamps: false,
  }
);

module.exports = TireDetails;
