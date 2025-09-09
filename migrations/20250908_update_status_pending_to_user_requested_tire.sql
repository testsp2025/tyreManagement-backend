-- Migration to update status from 'pending' to 'User Requested tire'
-- This migration will:
-- 1. Add 'User Requested tire' to the ENUM
-- 2. Update all existing 'pending' records to 'User Requested tire'
-- 3. Remove 'pending' from the ENUM

-- Step 1: First add the new value to the ENUM
ALTER TABLE requests MODIFY status ENUM(
  'pending',
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

-- Step 2: Update all existing 'pending' records to 'User Requested tire'
UPDATE requests SET status = 'User Requested tire' WHERE status = 'pending';

-- Step 3: Remove 'pending' from the ENUM and set new default
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

-- Update any existing 'pending' records in requestbackup table
UPDATE requestbackup SET status = 'User Requested tire' WHERE status = 'pending';