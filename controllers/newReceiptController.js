const { ReceiptModel } = require('../models/Receipt');

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
        
        // Get the receipt directly from the receipts table
        const receipt = await ReceiptModel.findOne({
            where: { order_id: req.params.orderId }
        });
        
        if (!receipt) {
            console.log('Receipt not found for order ID:', req.params.orderId);
            return res.status(404).json({ message: 'Receipt not found' });
        }

        console.log('Found receipt:', receipt.toJSON());

        // Format receipt data using only data from the receipts table
        const formattedReceipt = {
            id: receipt.id.toString(),
            orderId: receipt.order_id.toString(),
            requestId: receipt.request_id,
            receiptNumber: receipt.receipt_number,
            dateGenerated: receipt.date_generated,
            totalAmount: parseFloat(receipt.total_amount) || 0,
            customerOfficerId: receipt.customer_officer_id || '',
            customerOfficerName: receipt.customer_officer_name || '',
            vehicleNumber: receipt.vehicle_number || '',
            vehicleBrand: receipt.vehicle_brand || '',
            vehicleModel: receipt.vehicle_model || '',
            supplierName: receipt.supplier_name || '',
            supplierEmail: receipt.supplier_email || '',
            supplierPhone: receipt.supplier_phone || '',
            items: receipt.items || [],
            submittedDate: receipt.submitted_date,
            orderPlacedDate: receipt.order_placed_date,
            orderNumber: receipt.order_number || '',
            notes: receipt.notes || '',
            companyDetails: {
                name: 'SLT Mobitel Tire Management',
                address: '123 Corporate Drive, Colombo',
                phone: '+94 11 234 5678',
                email: 'tiremanagement@cpc.lk'
            }
        };

        console.log('Sending formatted receipt:', formattedReceipt);
        res.json(formattedReceipt);
    } catch (error) {
        console.error('Error fetching receipt:', error);
        res.status(500).json({ message: 'Error fetching receipt', error: error.message });
    }
};

exports.createReceipt = async (req, res) => {
    try {
        const { order_id } = req.body;
        
        // Generate receipt number (format: RCP-YYYYMMDD-XXXX)
        const date = new Date();
        const dateString = date.toISOString().split('T')[0].replace(/-/g, '');
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        const receiptNumber = `RCP-${dateString}-${randomNum}`;

        // Create receipt with data from the request
        const receiptData = {
            order_id,
            request_id: order_id.toString(),
            receipt_number: receiptNumber,
            date_generated: date,
            total_amount: req.body.totalAmount || 0,
            customer_officer_id: req.body.customerOfficerId || '',
            customer_officer_name: req.body.customerOfficerName || '',
            vehicle_number: req.body.vehicleNumber || '',
            vehicle_brand: req.body.vehicleBrand || '',
            vehicle_model: req.body.vehicleModel || '',
            supplier_name: req.body.supplierName || '',
            supplier_email: req.body.supplierEmail || '',
            supplier_phone: req.body.supplierPhone || '',
            items: req.body.items || [],
            notes: req.body.notes || '',
            submitted_date: req.body.submittedDate || null,
            order_placed_date: req.body.orderPlacedDate || null,
            order_number: req.body.orderNumber || ''
        };

        const receipt = await ReceiptModel.create(receiptData);
        res.status(201).json(receipt);
    } catch (error) {
        console.error('Error creating receipt:', error);
        res.status(500).json({ message: 'Error creating receipt', error: error.message });
    }
};
