-- Migration to remove 'pending' status and ensure 'User Requested tire' is the only initial status
-- This migration will:
-- 1. Remove 'pending' from the ENUM in both tables
-- 2. Update any remaining 'pending' records to 'User Requested tire'
-- 3. Set 'User Requested tire' as the default status

-- Update requests table
ALTER TABLE requests MODIFY status ENUM(
  'User Requested tire',
  'supervisor approved',
  'technical-manager approved',
  'engineer approved',
  'Engineer Approved',
  'customer-officer approved',
  'approved',
  'rejected',
  'supervisor rejected',
  'technical-manager rejected',
  'engineer rejected',
  'customer-officer rejected',
  'complete',
  'order placed',
  'order cancelled'
) DEFAULT 'User Requested tire';

-- Update requestbackup table
ALTER TABLE requestbackup MODIFY status ENUM(
  'User Requested tire',
  'supervisor approved',
  'technical-manager approved',
  'engineer approved',
  'Engineer Approved',
  'customer-officer approved',
  'approved',
  'rejected',
  'supervisor rejected',
  'technical-manager rejected',
  'engineer rejected',
  'customer-officer rejected',
  'complete',
  'order placed',
  'order cancelled'
) DEFAULT 'User Requested tire';

-- Update any remaining 'pending' records in requests table
UPDATE requests SET status = 'User Requested tire' WHERE status = 'pending';

-- Update any remaining 'pending' records in requestbackup table
UPDATE requestbackup SET status = 'User Requested tire' WHERE status = 'pending';