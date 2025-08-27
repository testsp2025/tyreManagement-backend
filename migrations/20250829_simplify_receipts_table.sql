-- Drop existing receipt_items table and receipts table
DROP TABLE IF EXISTS receipt_items;
DROP TABLE IF EXISTS receipts;

-- Create receipts table with simplified structure for SLT Mobitel
CREATE TABLE receipts (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL,
    request_id VARCHAR(50) NOT NULL,
    receipt_number VARCHAR(50) NOT NULL UNIQUE,
    date_generated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    total_amount DECIMAL(10,2) NOT NULL,
    customer_officer_id VARCHAR(50),
    customer_officer_name VARCHAR(255),
    vehicle_number VARCHAR(50) NOT NULL,
    vehicle_brand VARCHAR(255) NOT NULL,
    vehicle_model VARCHAR(255) NOT NULL,
    supplier_name VARCHAR(255) NOT NULL,
    supplier_email VARCHAR(255),
    supplier_phone VARCHAR(50),
    supplier_address TEXT,
    items JSONB NOT NULL,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES requests(id)
);

-- Create indexes
CREATE INDEX idx_receipts_order_id ON receipts(order_id);
CREATE INDEX idx_receipts_request_id ON receipts(request_id);
CREATE INDEX idx_receipts_receipt_number ON receipts(receipt_number);
