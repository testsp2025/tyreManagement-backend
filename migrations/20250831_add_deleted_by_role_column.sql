-- Migration to add deletedByRole column to requestbackup table
-- This will track which role (user type) performed the deletion for better audit trails

ALTER TABLE requestbackup 
ADD COLUMN deletedByRole VARCHAR(50) NULL 
AFTER deletedBy;

-- Add index for better query performance when filtering by role
CREATE INDEX idx_deleted_by_role ON requestbackup (deletedByRole);

-- Update any existing records to have NULL for now (they can be populated manually if needed)
-- ALTER TABLE requestbackup ADD COMMENT = 'Updated to include deletedByRole for enhanced audit tracking';