-- Add address column to supplier table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'supplier' 
        AND column_name = 'address'
    ) THEN
        ALTER TABLE supplier ADD COLUMN address TEXT;
    END IF;
END $$;
