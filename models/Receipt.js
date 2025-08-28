const { sequelize } = require("../config/db");
const { DataTypes } = require("sequelize");

const Receipt = sequelize.define(
  "Receipt",
  {
    id: { 
      type: DataTypes.INTEGER, 
      primaryKey: true, 
      autoIncrement: true 
    },
    order_id: { 
      type: DataTypes.STRING,
      allowNull: true
    },
    receipt_number: { 
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    total_amount: { 
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false 
    },
    vehicle_number: { 
      type: DataTypes.STRING,
      allowNull: false 
    },
    request_id: { 
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'requests',
        key: 'id'
      }
    },
    date_generated: { 
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    customer_officer_id: { 
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    customer_officer_name: { 
      type: DataTypes.STRING,
      allowNull: false 
    },
    vehicle_brand: { 
      type: DataTypes.STRING,
      allowNull: false 
    },
    vehicle_model: { 
      type: DataTypes.STRING,
      allowNull: false 
    },
    items: { 
      type: DataTypes.JSON,
      allowNull: false 
    },
    notes: { 
      type: DataTypes.TEXT,
      allowNull: true 
    },
    supplier_name: { 
      type: DataTypes.STRING,
      allowNull: true 
    },
    supplier_email: { 
      type: DataTypes.STRING,
      allowNull: true 
    },
    supplier_phone: { 
      type: DataTypes.STRING,
      allowNull: true 
    },
    submitted_date: { 
      type: DataTypes.DATE,
      allowNull: false 
    },
    order_placed_date: { 
      type: DataTypes.DATE,
      allowNull: false 
    },
    order_number: { 
      type: DataTypes.STRING,
      allowNull: true 
    }
  },
  {
    tableName: "receipts",
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
);

module.exports = Receipt;
