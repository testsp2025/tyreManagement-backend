-- Migration to update status from 'User Requested tire' to 'pending'
-- This migration will:
-- 1. Add 'pending' to the ENUM
-- 2. Update all existing 'User Requested tire' records to 'pending'
-- 3. Remove 'User Requested tire' from the ENUM

-- Step 1: First add the 'pending' value to the ENUM
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
) DEFAULT 'pending';

-- Step 2: Update all existing 'User Requested tire' records to 'pending'
UPDATE requests SET status = 'User Requested tire' WHERE status = 'User Requested tire';

-- Step 3: Remove 'User Requested tire' from the ENUM and set new default
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

-- Update any existing 'User Requested tire' records in requestbackup table
UPDATE requestbackup SET status = 'User Requested tire' WHERE status = 'User Requested tire';