const User = require("./User");
const Vehicle = require("./Vehicle");
const Request = require("./Request");
const RequestImage = require("./RequestImage");
const TireDetails = require("./TireDetails");
const Supplier = require("./Supplier");

// Associations
User.hasMany(Vehicle, { foreignKey: "registeredBy" });
Vehicle.belongsTo(User, { foreignKey: "registeredBy" });

User.hasMany(Request, { foreignKey: "userId" });
Request.belongsTo(User, { foreignKey: "userId" });

Vehicle.hasMany(Request, { foreignKey: "vehicleId" });
Request.belongsTo(Vehicle, { foreignKey: "vehicleId" });

Request.hasMany(RequestImage, { foreignKey: "requestId" });
RequestImage.belongsTo(Request, { foreignKey: "requestId" });

module.exports = {
  User,
  Vehicle,
  Request,
  RequestImage,
  TireDetails,
  Supplier,
};
