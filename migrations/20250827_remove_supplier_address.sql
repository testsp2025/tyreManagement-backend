-- Remove supplier_address column from receipts table
ALTER TABLE receipts DROP COLUMN IF EXISTS supplier_address;
