const { ReceiptModel } = require('../models/Receipt');
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
        const receipt = await ReceiptModel.create({
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
        const receipt = await ReceiptModel.findByPk(req.params.id);
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
        const receipt = await ReceiptModel.findOne({
            where: { order_id: req.params.orderId }
        });
        
        if (!receipt) {
            return res.status(404).json({ message: 'Receipt not found' });
        }

        // Get the related request to get additional details
        const request = await Request.findByPk(receipt.order_id);
        if (!request) {
            return res.status(404).json({ message: 'Related request not found' });
        }

        // Format receipt data for frontend
        const formattedReceipt = {
            id: receipt.id.toString(),
            orderId: receipt.order_id.toString(),
            requestId: receipt.order_id.toString(),
            receiptNumber: receipt.receipt_number,
            dateGenerated: receipt.created_at,
            totalAmount: Number(receipt.total_amount),
            customerOfficerId: request.customer_officer_decision_by || '',
            customerOfficerName: receipt.customer_name,
            vehicleNumber: receipt.vehicle_number,
            vehicleBrand: request.vehicleBrand,
            vehicleModel: request.vehicleModel,
            supplierName: receipt.supplier_name,
            supplierEmail: request.supplier_email || '',
            supplierPhone: request.supplier_phone || '',
            supplierAddress: request.supplier_address || '',
            items: [{
                description: `${request.tireSizeRequired} Tires`,
                quantity: request.quantity,
                unitPrice: Number(request.totalPrice) / request.quantity,
                total: Number(request.totalPrice),
                itemDetails: {
                    tireSize: request.tireSizeRequired,
                    brand: request.existingTireMake
                }
            }],
            subtotal: Number(request.totalPrice),
            tax: Number(request.totalPrice) * 0.12, // 12% tax
            discount: 0,
            paymentMethod: 'Corporate Account',
            paymentStatus: 'Paid',
            notes: request.customer_officer_note || '',
            companyDetails: {
                name: 'CPC Tire Management',
                address: '123 Corporate Drive, Colombo',
                phone: '+94 11 234 5678',
                email: 'tiremanagement@cpc.lk',
                website: 'https://www.cpc.lk',
                logo: '/company-logo.png'
            }
        };

        // If tubes were ordered, add them as a separate item
        if (request.tubesQuantity > 0) {
            formattedReceipt.items.push({
                description: 'Tire Tubes',
                quantity: request.tubesQuantity,
                unitPrice: 0, // Set actual tube price if available
                total: 0,     // Set actual tube total if available
                itemDetails: {
                    tireSize: request.tireSizeRequired
                }
            });
        }

        console.log('Sending formatted receipt:', formattedReceipt);
        res.json(formattedReceipt);
    } catch (error) {
        console.error('Error fetching receipt:', error);
        res.status(500).json({ message: 'Error fetching receipt', error: error.message });
    }
};
