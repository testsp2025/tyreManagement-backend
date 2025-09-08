-- Migration to update status from 'User Requested tire' to 'pending'
-- This migration will:
-- 1. Add 'pending' to the ENUM
-- 2. Update all existing 'User Requested tire' records to 'pending'
-- 3. Remove 'User Requested tire' from the ENUM

-- Step 1: First add the 'pending' value to the ENUM
ALTER TABLE requests MODIFY status ENUM(
  'User Requested tire',
  'pending',
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
) DEFAULT 'pending';

-- Step 2: Update all existing 'User Requested tire' records to 'pending'
UPDATE requests SET status = 'pending' WHERE status = 'User Requested tire';

-- Step 3: Remove 'User Requested tire' from the ENUM and set new default
ALTER TABLE requests MODIFY status ENUM(
  'pending',
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
) DEFAULT 'pending';

-- Update requestbackup table as well
ALTER TABLE requestbackup MODIFY status ENUM(
  'pending',
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
) DEFAULT 'pending';

-- Update any existing 'User Requested tire' records in requestbackup table
UPDATE requestbackup SET status = 'pending' WHERE status = 'User Requested tire';