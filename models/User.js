const { sequelize, pool } = require("../config/db");
const { DataTypes } = require("sequelize");

// Sequelize model for auto table creation
const UserModel = sequelize.define(
  "User",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    azure_id: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    email: { type: DataTypes.STRING(255), allowNull: false, unique: true },
    name: { type: DataTypes.STRING(255) },
    role: { type: DataTypes.STRING(50) },
    costCentre: { type: DataTypes.STRING(100) },
    department: { type: DataTypes.STRING(100) },
  },
  {
    tableName: "users",
    timestamps: false,
  }
);

// ...your existing class logic here (if any)...

module.exports = UserModel;
module.exports.UserModel = UserModel;
