const { ReceiptModel } = require('../models/Receipt');
const Request = require('../models/Request');
const { User } = require('../models/User');
const { Supplier } = require('../models/Supplier');

// Set up the associations
ReceiptModel.belongsTo(Request, { 
    foreignKey: 'order_id',
    as: 'request'
});

exports.createReceipt = async (req, res) => {
    try {
        const { order_id } = req.body;
        
        // Get the order details with all related information
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

        // Create receipt with complete information
        const receipt = await ReceiptModel.create({
            order_id: order.id,
            request_id: order.id.toString(),
            receipt_number: receiptNumber,
            date_generated: new Date(),
            total_amount: order.totalPrice || 0,
            customer_officer_id: order.customer_officer_decision_by,
            customer_officer_name: order.user ? order.user.name : '',
            vehicle_number: order.vehicleNumber,
            vehicle_brand: order.vehicleBrand,
            vehicle_model: order.vehicleModel,
            supplier_name: order.supplier ? order.supplier.name : order.supplierName,
            supplier_email: order.supplier ? order.supplier.email : order.supplierEmail,
            supplier_phone: order.supplier ? order.supplier.phone : order.supplierPhone,
            items: [{
                description: `${order.tireSizeRequired} Tires`,
                quantity: order.quantity,
                unitPrice: order.totalPrice ? Number(order.totalPrice) / order.quantity : 0,
                total: Number(order.totalPrice) || 0,
                itemDetails: {
                    tireSize: order.tireSizeRequired,
                    brand: order.existingTireMake
                }
            }],
            notes: order.customer_officer_note,
            submitted_date: order.submittedAt,
            order_placed_date: order.orderPlacedDate,
            order_number: order.orderNumber
        });

        res.status(201).json(receipt);
    } catch (error) {
        console.error('Error creating receipt:', error);
        res.status(500).json({ message: 'Error creating receipt', error: error.message });
    }
};

exports.getReceipt = async (req, res) => {
    try {
        const receipt = await ReceiptModel.findByPk(req.params.id, {
            include: [{
                model: Request,
                as: 'request',
                include: [
                    {
                        model: User,
                        as: 'user'
                    },
                    {
                        model: Supplier,
                        as: 'supplier'
                    }
                ]
            }]
        });
        
        if (!receipt) {
            return res.status(404).json({ message: 'Receipt not found' });
        }

        const request = receipt.request;
        const user = request?.user;
        const supplier = request?.supplier;

        // Format receipt data for frontend with all available info
        const formattedReceipt = {
            id: receipt.id.toString(),
            orderId: receipt.order_id.toString(),
            requestId: receipt.request_id.toString(),
            receiptNumber: receipt.receipt_number,
            dateGenerated: receipt.date_generated,
            totalAmount: Number(receipt.total_amount),
            customerOfficerId: user?.id || receipt.customer_officer_id || '',
            customerOfficerName: user?.name || receipt.customer_officer_name || '',
            vehicleNumber: request?.vehicleNumber || receipt.vehicle_number,
            vehicleBrand: request?.vehicleBrand || receipt.vehicle_brand,
            vehicleModel: request?.vehicleModel || receipt.vehicle_model,
            supplierName: supplier?.name || request?.supplierName || receipt.supplier_name,
            supplierEmail: supplier?.email || request?.supplierEmail || receipt.supplier_email,
            supplierPhone: supplier?.phone || request?.supplierPhone || receipt.supplier_phone,
            items: receipt.items || [],
            notes: receipt.notes || '',
            submittedDate: receipt.submitted_date,
            orderPlacedDate: receipt.order_placed_date,
            orderNumber: receipt.order_number
        };

        res.json(formattedReceipt);
    } catch (error) {
        console.error('Error fetching receipt:', error);
        res.status(500).json({ message: 'Error fetching receipt', error: error.message });
    }
};

exports.getReceiptByOrderId = async (req, res) => {
    try {
        // Find receipt with eager loading of all related data
        const receipt = await ReceiptModel.findOne({
            where: { order_id: req.params.orderId },
            include: [{
                model: Request,
                as: 'request',
                include: [
                    {
                        model: User,
                        as: 'user',
                        attributes: ['id', 'name', 'email']
                    },
                    {
                        model: Supplier,
                        as: 'supplier',
                        attributes: ['id', 'name', 'email', 'phone']
                    }
                ]
            }]
        });
        
        if (!receipt) {
            return res.status(404).json({ message: 'Receipt not found' });
        }

        const request = receipt.request;
        const user = request?.user;
        const supplier = request?.supplier;

        if (!request) {
            return res.status(404).json({ message: 'Related request not found' });
        }

        // Format receipt data for frontend with complete information
        const formattedReceipt = {
            id: receipt.id.toString(),
            orderId: receipt.order_id.toString(),
            requestId: receipt.request_id.toString(),
            receiptNumber: receipt.receipt_number,
            dateGenerated: receipt.date_generated,
            totalAmount: Number(receipt.total_amount),
            customerOfficerId: user?.id || receipt.customer_officer_id || request.customer_officer_decision_by || '',
            customerOfficerName: user?.name || receipt.customer_officer_name || '',
            vehicleNumber: request.vehicleNumber || receipt.vehicle_number,
            vehicleBrand: request.vehicleBrand || receipt.vehicle_brand,
            vehicleModel: request.vehicleModel || receipt.vehicle_model,
            supplierName: supplier?.name || request.supplierName || receipt.supplier_name,
            supplierEmail: supplier?.email || request.supplierEmail || receipt.supplier_email,
            supplierPhone: supplier?.phone || request.supplierPhone || receipt.supplier_phone,
            items: receipt.items || [],
            notes: receipt.notes || request.customer_officer_note || '',
            submittedDate: receipt.submitted_date || request.submittedAt,
            orderPlacedDate: receipt.order_placed_date || request.orderPlacedDate,
            orderNumber: receipt.order_number || request.orderNumber
        };

        // Add tubes as separate item if present
        if (request.tubesQuantity > 0) {
            formattedReceipt.items.push({
                description: 'Tire Tubes',
                quantity: request.tubesQuantity,
                unitPrice: 0,
                total: 0,
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
