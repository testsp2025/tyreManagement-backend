const Request = require('./Request');
const { User } = require('./User');
const { Supplier } = require('./Supplier');

// Request associations
Request.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user'
});

Request.belongsTo(User, {
    foreignKey: 'customer_officer_decision_by',
    as: 'customerOfficer'
});

Request.belongsTo(Supplier, {
    foreignKey: 'supplierId',
    as: 'supplier'
});

module.exports = {
    setupAssociations: () => {
        // The associations are set up when this file is required
    }
};
