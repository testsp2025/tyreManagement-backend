const { ReceiptModel } = require('../models/Receipt');
const Request = require('../models/Request');

exports.createReceipt = async (req, res) => {
    try {
        // Get the request ID from the URL parameter
        const requestId = req.params.requestId;
        
        // Check if receipt already exists
        const existingReceipt = await ReceiptModel.findOne({
            where: { order_id: requestId }
        });

        if (existingReceipt) {
            return res.status(400).json({ message: 'Receipt already exists for this order' });
        }

        // Get the request details
        const request = await Request.findByPk(requestId);

        if (!request) {
            return res.status(404).json({ message: 'Request not found' });
        }

        // Generate receipt number (format: RCP-YYYYMMDD-XXXX)
        const date = new Date();
        const dateString = date.toISOString().split('T')[0].replace(/-/g, '');
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        const receiptNumber = `RCP-${dateString}-${randomNum}`;

        // Create receipt
        const receipt = await ReceiptModel.create({
            order_id: requestId,
            request_id: requestId,
            receipt_number: receiptNumber,
            date_generated: new Date(),
            total_amount: request.totalPrice || 0,
            customer_officer_id: request.customer_officer_decision_by,
            customer_officer_name: request.customerOfficerName,
            vehicle_number: request.vehicleNumber,
            vehicle_brand: request.vehicleBrand,
            vehicle_model: request.vehicleModel,
            supplier_name: request.supplierName,
            supplier_email: request.supplierEmail,
            supplier_phone: request.supplierPhone,
            items: [{
                description: `${request.tireSizeRequired} Tires`,
                quantity: request.quantity || 1,
                unitPrice: request.totalPrice ? Number(request.totalPrice) / (request.quantity || 1) : 0,
                total: Number(request.totalPrice) || 0,
                itemDetails: {
                    tireSize: request.tireSizeRequired,
                    brand: request.existingTireMake
                }
            }],
            notes: request.customer_officer_note,
            submitted_date: request.submittedAt,
            order_placed_date: request.orderPlacedDate,
            order_number: request.orderNumber
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

        // Get the related request for additional details
        const request = await Request.findByPk(receipt.order_id);
        
        if (!request) {
            return res.status(404).json({ message: 'Related request not found' });
        }

        // Format receipt for frontend display
        const formattedReceipt = {
            id: receipt.id.toString(),
            orderId: receipt.order_id.toString(),
            requestId: receipt.request_id.toString(),
            receiptNumber: receipt.receipt_number,
            dateGenerated: receipt.date_generated,
            totalAmount: Number(receipt.total_amount),
            customerOfficerId: receipt.customer_officer_id,
            customerOfficerName: receipt.customer_officer_name,
            vehicleNumber: receipt.vehicle_number,
            vehicleBrand: receipt.vehicle_brand,
            vehicleModel: receipt.vehicle_model,
            supplierName: receipt.supplier_name,
            supplierEmail: receipt.supplier_email,
            supplierPhone: receipt.supplier_phone,
            items: receipt.items,
            notes: receipt.notes,
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
