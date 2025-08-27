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
  request_id: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  receipt_number: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
  },
  date_generated: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  total_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  customer_officer_id: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  customer_officer_name: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  vehicle_number: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  vehicle_brand: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  vehicle_model: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  supplier_details: {
    type: DataTypes.JSON,
    allowNull: false,
  },
  items: {
    type: DataTypes.JSON,
    allowNull: false,
  },
  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  tax: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  discount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  payment_method: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  payment_status: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'Paid',
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  company_details: {
    type: DataTypes.JSON,
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
