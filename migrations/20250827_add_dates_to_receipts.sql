-- Add submitted_date, order_placed_date and order_number columns to receipts table
ALTER TABLE receipts
ADD COLUMN submitted_date TIMESTAMP,
ADD COLUMN order_placed_date TIMESTAMP,
ADD COLUMN order_number VARCHAR(50);

-- Create indexes for the new columns
CREATE INDEX idx_receipts_submitted_date ON receipts(submitted_date);
CREATE INDEX idx_receipts_order_placed_date ON receipts(order_placed_date);
CREATE INDEX idx_receipts_order_number ON receipts(order_number);
