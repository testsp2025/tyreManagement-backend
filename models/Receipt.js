const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const ReceiptModel = sequelize.define('Receipt', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  order_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'requests',
      key: 'id',
    },
  },
  receipt_number: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
  },
  customer_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  order_date: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  total_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  supplier_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  vehicle_number: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  tire_details: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
}, {
  tableName: 'receipts',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = ReceiptModel;
module.exports.ReceiptModel = ReceiptModel;
