-- Drop existing receipt_items table and receipts table
DROP TABLE IF EXISTS receipt_items;
DROP TABLE IF EXISTS receipts;

-- Recreate receipts table with new structure
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
    supplier_details JSONB NOT NULL,
    items JSONB NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    tax DECIMAL(10,2) NOT NULL,
    discount DECIMAL(10,2),
    payment_method VARCHAR(50),
    payment_status VARCHAR(50) NOT NULL DEFAULT 'Paid',
    notes TEXT,
    company_details JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES requests(id)
);

-- Create indexes
CREATE INDEX idx_receipts_order_id ON receipts(order_id);
CREATE INDEX idx_receipts_request_id ON receipts(request_id);
CREATE INDEX idx_receipts_receipt_number ON receipts(receipt_number);
