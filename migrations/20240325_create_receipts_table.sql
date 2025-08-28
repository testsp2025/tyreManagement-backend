-- Create receipts table
CREATE TABLE IF NOT EXISTS receipts (
    id SERIAL PRIMARY KEY,
    order_id VARCHAR(255),
    receipt_number VARCHAR(255) UNIQUE NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    vehicle_number VARCHAR(255) NOT NULL,
    request_id INTEGER NOT NULL REFERENCES requests(id),
    date_generated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    customer_officer_id INTEGER NOT NULL REFERENCES users(id),
    customer_officer_name VARCHAR(255) NOT NULL,
    vehicle_brand VARCHAR(255) NOT NULL,
    vehicle_model VARCHAR(255) NOT NULL,
    items JSONB NOT NULL,
    notes TEXT,
    supplier_name VARCHAR(255),
    supplier_email VARCHAR(255),
    supplier_phone VARCHAR(255),
    submitted_date TIMESTAMP WITH TIME ZONE NOT NULL,
    order_placed_date TIMESTAMP WITH TIME ZONE NOT NULL,
    order_number VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
