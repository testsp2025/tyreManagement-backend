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
  supplier_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  supplier_email: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  supplier_phone: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  items: {
    type: DataTypes.JSON,
    allowNull: false,
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  submitted_date: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  order_placed_date: {
    type: DataTypes.DATE,
    allowNull: true,
  }
}, {
  tableName: 'receipts',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = ReceiptModel;
module.exports.ReceiptModel = ReceiptModel;
