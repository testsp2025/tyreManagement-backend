const { sequelize, pool } = require("../config/db");
const { DataTypes } = require("sequelize");

const RequestImageModel = sequelize.define(
  "RequestImage",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    requestId: { type: DataTypes.INTEGER, allowNull: false },
    imagePath: { type: DataTypes.STRING(255), allowNull: false },
    imageIndex: { type: DataTypes.INTEGER, allowNull: false },
  },
  {
    tableName: "request_images",
    timestamps: false,
  }
);

// ...your existing class logic here (if any)...

module.exports = RequestImageModel;
module.exports.RequestImageModel = RequestImageModel;
