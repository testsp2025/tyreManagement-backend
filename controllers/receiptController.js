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
            request_id: order.id.toString(),
            receipt_number: receiptNumber,
            date_generated: new Date(),
            total_amount: order.totalPrice || 0,
            customer_officer_id: order.customer_officer_decision_by,
            customer_officer_name: order.user ? order.user.name : '',
            vehicle_number: order.vehicleNumber,
            vehicle_brand: order.vehicleBrand,
            vehicle_model: order.vehicleModel,
            supplier_name: order.supplierName,
            supplier_email: order.supplierEmail,
            supplier_phone: order.supplierPhone,
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
            attributes: [
                'id', 'order_id', 'request_id', 'receipt_number', 'date_generated',
                'total_amount', 'customer_officer_id', 'customer_officer_name',
                'vehicle_number', 'vehicle_brand', 'vehicle_model',
                'supplier_name', 'supplier_email', 'supplier_phone',
                'items', 'notes', 'submitted_date', 'order_placed_date', 'order_number'
            ]
        });
        
        if (!receipt) {
            return res.status(404).json({ message: 'Receipt not found' });
        }

        // Format receipt data for frontend
        const formattedReceipt = {
            id: receipt.id.toString(),
            orderId: receipt.order_id.toString(),
            requestId: receipt.request_id.toString(),
            receiptNumber: receipt.receipt_number,
            dateGenerated: receipt.date_generated,
            totalAmount: Number(receipt.total_amount),
            customerOfficerId: receipt.customer_officer_id || '',
            customerOfficerName: receipt.customer_officer_name || '',
            vehicleNumber: receipt.vehicle_number,
            vehicleBrand: receipt.vehicle_brand,
            vehicleModel: receipt.vehicle_model,
            supplierName: receipt.supplier_name,
            supplierEmail: receipt.supplier_email,
            supplierPhone: receipt.supplier_phone,
            items: receipt.items || [],
            notes: receipt.notes || '',
            submittedDate: receipt.submitted_date,
            orderPlacedDate: receipt.order_placed_date,
            orderNumber: receipt.order_number
        };

        res.json(formattedReceipt);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching receipt', error: error.message });
    }
};

exports.getReceiptByOrderId = async (req, res) => {
    try {
        const receipt = await ReceiptModel.findOne({
            where: { order_id: req.params.orderId },
            attributes: [
                'id', 'order_id', 'request_id', 'receipt_number', 'date_generated',
                'total_amount', 'customer_officer_id', 'customer_officer_name',
                'vehicle_number', 'vehicle_brand', 'vehicle_model',
                'supplier_name', 'supplier_email', 'supplier_phone',
                'items', 'notes', 'submitted_date', 'order_placed_date', 'order_number'
            ]
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
            requestId: receipt.request_id.toString(),
            receiptNumber: receipt.receipt_number,
            dateGenerated: receipt.date_generated,
            totalAmount: Number(receipt.total_amount),
            customerOfficerId: receipt.customer_officer_id || '',
            customerOfficerName: receipt.customer_officer_name || '',
            vehicleNumber: receipt.vehicle_number,
            vehicleBrand: receipt.vehicle_brand,
            vehicleModel: receipt.vehicle_model,
            supplierName: receipt.supplier_name,
            supplierEmail: receipt.supplier_email,
            supplierPhone: receipt.supplier_phone,
            items: receipt.items || [],
            notes: receipt.notes || '',
            submittedDate: receipt.submitted_date,
            orderPlacedDate: receipt.order_placed_date,
            orderNumber: receipt.order_number
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
