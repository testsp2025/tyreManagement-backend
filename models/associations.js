const Receipt = require('./Receipt');
const Request = require('./Request');
const User = require('./User');

// Receipt associations
Receipt.belongsTo(Request, {
    foreignKey: 'request_id',
    as: 'request'
});

Receipt.belongsTo(User, {
    foreignKey: 'customer_officer_id',
    as: 'customerOfficer'
});

// Request associations with Receipt
Request.hasOne(Receipt, {
    foreignKey: 'request_id',
    as: 'receipt'
});

module.exports = {
    Receipt,
    Request,
    User
};
