-- Migration to ensure 'User Requested tire' is the default status
-- This migration will:
-- 1. Ensure 'User Requested tire' is in the ENUM
-- 2. Set the default value for status column to 'User Requested tire'

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