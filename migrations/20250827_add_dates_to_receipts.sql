-- Add submitted_date and order_placed_date columns to receipts table
ALTER TABLE receipts
ADD COLUMN submitted_date TIMESTAMP,
ADD COLUMN order_placed_date TIMESTAMP;

-- Create indexes for the new date columns
CREATE INDEX idx_receipts_submitted_date ON receipts(submitted_date);
CREATE INDEX idx_receipts_order_placed_date ON receipts(order_placed_date);
