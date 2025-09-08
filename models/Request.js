const { sequelize } = require("../config/db");
const { DataTypes } = require("sequelize");

const Request = sequelize.define(
  "Request",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    vehicleId: { type: DataTypes.INTEGER, allowNull: false },
    vehicleNumber: { type: DataTypes.STRING(50), allowNull: false },
    quantity: { type: DataTypes.INTEGER, allowNull: false },
    tubesQuantity: { type: DataTypes.INTEGER, allowNull: false },
    tireSize: { type: DataTypes.STRING(50), allowNull: false },
    requestReason: { type: DataTypes.TEXT, allowNull: false },
    requesterName: { type: DataTypes.STRING(100), allowNull: false },
    requesterEmail: { type: DataTypes.STRING(100), allowNull: false },
    requesterPhone: { type: DataTypes.STRING(20), allowNull: false },
    vehicleBrand: { type: DataTypes.STRING(50), allowNull: false },
    vehicleModel: { type: DataTypes.STRING(50), allowNull: false },
    lastReplacementDate: { type: DataTypes.DATEONLY, allowNull: false },
    existingTireMake: { type: DataTypes.STRING(100), allowNull: false },
    tireSizeRequired: { type: DataTypes.STRING(50), allowNull: false },
    presentKmReading: { type: DataTypes.INTEGER, allowNull: false },
    previousKmReading: { type: DataTypes.INTEGER, allowNull: false },
    tireWearPattern: { type: DataTypes.STRING(100), allowNull: false },
    comments: { type: DataTypes.TEXT },
    status: {
      type: DataTypes.ENUM(
        "User Requested tire",
        "supervisor approved",
        "technical-manager approved",
        "engineer approved",
        "Engineer Approved",
        "customer-officer approved",
        "approved",
        "rejected",
        "supervisor rejected",
        "technical-manager rejected",
        "engineer rejected",
        "customer-officer rejected",
        "complete",
        "order placed",
        "order cancelled"
      ),
      defaultValue: "User Requested tire",
    },
    submittedAt: { type: DataTypes.DATE, allowNull: false },
    supervisor_notes: { type: DataTypes.TEXT },
    technical_manager_note: { type: DataTypes.TEXT },
    engineer_note: { type: DataTypes.TEXT },
    customer_officer_note: { type: DataTypes.TEXT },
    supervisorId: {
      type: DataTypes.INTEGER,
      allowNull: false, // or true if you want it optional
      references: {
        model: "users", // table name in your DB (usually lowercase plural)
        key: "id",
      },
    },
    technical_manager_id: {
      type: DataTypes.INTEGER,
      allowNull: true, // optional since not all requests go through technical manager
      references: {
        model: "users",
        key: "id",
      },
    },
    supervisor_decision_by: {
      type: DataTypes.INTEGER,
      allowNull: true, // tracks which supervisor approved/rejected
      references: {
        model: "users",
        key: "id",
      },
    },
    engineer_decision_by: {
      type: DataTypes.INTEGER,
      allowNull: true, // tracks which engineer approved/rejected
      references: {
        model: "users",
        key: "id",
      },
    },
    customer_officer_decision_by: {
      type: DataTypes.INTEGER,
      allowNull: true, // tracks which customer officer processed the order
      references: {
        model: "users",
        key: "id",
      },
    },
    // New delivery and pricing fields
    deliveryOfficeName: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    deliveryStreetName: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    deliveryTown: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    totalPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    warrantyDistance: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    tireWearIndicatorAppeared: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
    // Department and Cost Center fields
    userSection: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'Department', // Maps to the Department column in database
    },
    costCenter: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'CostCenter', // Maps to the CostCenter column in database
    },
    // Order details
    supplierName: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    supplierEmail: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    supplierPhone: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    orderNumber: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    orderNotes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    orderPlacedDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
  },
  {
    tableName: "requests",
    timestamps: false,
  }
);

module.exports = Request;
