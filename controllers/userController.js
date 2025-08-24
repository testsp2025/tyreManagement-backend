const { User } = require("../models");

exports.getSupervisors = async (req, res) => {
  try {
    const supervisors = await User.findAll({ where: { role: "supervisor" } });
    res.json(supervisors);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch supervisors" });
  }
};

exports.getCustomerOfficers = async (req, res) => {
  try {
    const customerOfficers = await User.findAll({
      where: { role: "customer-officer" },
    });
    res.json(customerOfficers);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch customer officers" });
  }
};
