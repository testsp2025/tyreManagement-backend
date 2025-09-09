-- Migration to update status from 'pending' to 'User Requested tire'
-- This migration will:
-- 1. Ensure 'User Requested tire' is in the ENUM
-- 2. Update all existing records to 'User Requested tire'
-- 3. Maintain consistent status values

-- Step 1: Define the ENUM with 'User Requested tire' as the default
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

-- Step 2: Update all existing records to 'User Requested tire'
UPDATE requests SET status = 'User Requested tire' WHERE status = 'pending';

-- Step 3: The ENUM is already correctly defined with 'User Requested tire' as default

-- Update requestbackup table as well
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

-- Update any existing records in requestbackup table
UPDATE requestbackup SET status = 'User Requested tire' WHERE status = 'pending';