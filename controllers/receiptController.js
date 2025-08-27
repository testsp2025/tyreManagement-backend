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
        console.log('Fetching receipt for order ID:', req.params.orderId);
        
        // First get the request to ensure we have all order details
        const request = await Request.findOne({
            where: { id: req.params.orderId },
            raw: true
        });

        if (!request) {
            console.log('Request not found for order ID:', req.params.orderId);
            return res.status(404).json({ message: 'Request not found' });
        }

        console.log('Found request with details:', request);

        // Then get the receipt
        const receipt = await ReceiptModel.findOne({
            where: { order_id: req.params.orderId }
        });
        
        if (!receipt) {
            console.log('Receipt not found for order ID:', req.params.orderId);
            // Create a new receipt if it doesn't exist
            const newReceiptData = {
                order_id: request.id,
                request_id: request.id.toString(),
                receipt_number: `RCP-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`,
                date_generated: new Date(),
                total_amount: request.totalPrice || 0,
                customer_officer_id: request.customer_officer_decision_by,
                customer_officer_name: request.requesterName,
                vehicle_number: request.vehicleNumber,
                vehicle_brand: request.vehicleBrand,
                vehicle_model: request.vehicleModel,
                supplier_name: request.supplierName,
                supplier_email: request.supplierEmail,
                supplier_phone: request.supplierPhone,
                items: [{
                    description: `${request.tireSizeRequired} Tires`,
                    quantity: request.quantity,
                    unitPrice: request.totalPrice ? parseFloat(request.totalPrice) / request.quantity : 0,
                    total: parseFloat(request.totalPrice) || 0,
                    itemDetails: {
                        tireSize: request.tireSizeRequired,
                        brand: request.existingTireMake
                    }
                }],
                notes: request.customer_officer_note,
                submitted_date: request.submittedAt,
                order_placed_date: request.orderPlacedDate,
                order_number: request.orderNumber
            };
            
            const newReceipt = await ReceiptModel.create(newReceiptData);
            receipt = newReceipt;
        }
        
        if (!request) {
            console.log('Related request not found for order ID:', receipt.order_id);
            return res.status(404).json({ message: 'Related request not found' });
        }

        console.log('Found receipt:', receipt.toJSON());
        console.log('Found request:', request);

        // Format receipt data for frontend
        const formattedReceipt = {
            id: receipt.id.toString(),
            orderId: receipt.order_id.toString(),
            requestId: request.id.toString(),
            receiptNumber: receipt.receipt_number,
            dateGenerated: new Date().toISOString(),
            totalAmount: parseFloat(request.totalPrice) || 0,
            customerOfficerId: request.customer_officer_decision_by || '',
            customerOfficerName: request.requesterName || '',
            vehicleNumber: request.vehicleNumber || '',
            vehicleBrand: request.vehicleBrand || '',
            vehicleModel: request.vehicleModel || '',
            supplierName: request.supplierName || '',
            supplierEmail: request.supplierEmail || '',
            supplierPhone: request.supplierPhone || '',
            supplierAddress: receipt.supplier_address || '',
            items: receipt.items && receipt.items.length > 0 ? receipt.items : [{
                description: `${request.tireSizeRequired || ''} Tires`,
                quantity: request.quantity || 0,
                unitPrice: request.totalPrice ? parseFloat(request.totalPrice) / (request.quantity || 1) : 0,
                total: parseFloat(request.totalPrice) || 0,
                itemDetails: {
                    tireSize: request.tireSizeRequired || '',
                    brand: request.existingTireMake || ''
                }
            }],
            subtotal: parseFloat(request.totalPrice) || 0,
            tax: (parseFloat(request.totalPrice) || 0) * 0.12, // 12% tax
            discount: 0,
            paymentMethod: 'Corporate Account',
            paymentStatus: 'Paid',
            notes: request.customer_officer_note || '',
            submittedDate: request.submittedAt ? new Date(request.submittedAt).toISOString() : null,
            orderPlacedDate: request.orderPlacedDate ? new Date(request.orderPlacedDate).toISOString() : null,
            orderNumber: request.orderNumber || '',
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
