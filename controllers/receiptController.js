const Receipt = require('../models/Receipt');
const Request = require('../models/Request');

exports.createReceipt = async (req, res) => {
    try {
        const { order_id } = req.body;
        
        // Get the order details
        const order = await Request.findByPk(order_id, {
            include: ['vehicle', 'supplier', 'user']
        });

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Generate receipt number (format: RCP-YYYYMMDD-XXXX)
        const date = new Date();
        const dateString = date.toISOString().split('T')[0].replace(/-/g, '');
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        const receiptNumber = `RCP-${dateString}-${randomNum}`;

        // Create receipt
        const receipt = await Receipt.create({
            order_id: order.id,
            receipt_number: receiptNumber,
            customer_name: order.user.name,
            order_date: order.createdAt,
            total_amount: order.totalAmount,
            supplier_name: order.supplier.name,
            vehicle_number: order.vehicle.vehicleNumber,
            tire_details: JSON.stringify(order.tireDetails),
        });

        res.status(201).json(receipt);
    } catch (error) {
        console.error('Error creating receipt:', error);
        res.status(500).json({ message: 'Error creating receipt', error: error.message });
    }
};

exports.getReceipt = async (req, res) => {
    try {
        const receipt = await Receipt.findByPk(req.params.id);
        if (!receipt) {
            return res.status(404).json({ message: 'Receipt not found' });
        }
        res.json(receipt);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching receipt', error: error.message });
    }
};

exports.getReceiptByOrderId = async (req, res) => {
    try {
        const receipt = await Receipt.findOne({
            where: { order_id: req.params.orderId }
        });
        if (!receipt) {
            return res.status(404).json({ message: 'Receipt not found' });
        }
        res.json(receipt);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching receipt', error: error.message });
    }
};
