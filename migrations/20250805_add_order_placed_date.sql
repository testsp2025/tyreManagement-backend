-- Add orderPlacedDate column to requests table
ALTER TABLE requests
ADD COLUMN orderPlacedDate TIMESTAMP WITH TIME ZONE;