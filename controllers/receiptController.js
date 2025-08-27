const { ReceiptModel } = require('../models/Receipt');
const Request = require('../models/Request');

exports.createReceipt = async (req, res) => {
    try {
        const { order_id } = req.body;
        
        // Get the order details
        const order = await Request.findByPk(order_id);

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        console.log('Creating receipt for order:', order.toJSON());

        // Generate receipt number (format: RCP-YYYYMMDD-XXXX)
        const date = new Date();
        const dateString = date.toISOString().split('T')[0].replace(/-/g, '');
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        const receiptNumber = `RCP-${dateString}-${randomNum}`;

        // Create receipt
        const receiptData = {
            order_id: order.id,
            request_id: order.id.toString(),
            receipt_number: receiptNumber,
            date_generated: new Date(),
            total_amount: order.totalPrice || 0,
            customer_officer_id: order.customer_officer_decision_by,
            customer_officer_name: order.requesterName, // Use requester name if available
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
            notes: order.customer_officer_note
        };

        console.log('Creating receipt with data:', receiptData);
        const receipt = await ReceiptModel.create(receiptData);

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
        console.log('Fetching receipt for order:', req.params.orderId);
        
        const receipt = await ReceiptModel.findOne({
            where: { order_id: req.params.orderId }
        });
        
        if (!receipt) {
            console.log('Receipt not found for order:', req.params.orderId);
            return res.status(404).json({ message: 'Receipt not found' });
        }

        // Get the related request to get additional details
        const request = await Request.findByPk(receipt.order_id);
        if (!request) {
            console.log('Related request not found for receipt:', receipt.id);
            return res.status(404).json({ message: 'Related request not found' });
        }

        console.log('Found receipt:', receipt.toJSON());
        console.log('Found request:', request.toJSON());

        // Format receipt data for frontend
        const formattedReceipt = {
            id: receipt.id.toString(),
            orderId: receipt.order_id.toString(),
            requestId: receipt.request_id,
            receiptNumber: receipt.receipt_number,
            dateGenerated: receipt.date_generated,
            totalAmount: Number(receipt.total_amount),
            customerOfficerId: receipt.customer_officer_id || '',
            customerOfficerName: receipt.customer_officer_name,
            vehicleNumber: receipt.vehicle_number,
            vehicleBrand: receipt.vehicle_brand,
            vehicleModel: receipt.vehicle_model,
            // Use request's supplier info if receipt's is missing
            supplierName: receipt.supplier_name || request.supplierName,
            supplierEmail: receipt.supplier_email || request.supplierEmail,
            supplierPhone: receipt.supplier_phone || request.supplierPhone,
            items: receipt.items,
            subtotal: Number(request.totalPrice),
            tax: Number(request.totalPrice) * 0.12, // 12% tax
            discount: 0,
            paymentMethod: 'Corporate Account',
            paymentStatus: 'Paid',
            notes: request.customer_officer_note || '',
            companyDetails: {
                name: 'SLT Mobitel Tire Management',
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
