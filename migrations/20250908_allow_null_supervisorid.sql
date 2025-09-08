-- Allow null supervisorId in requestbackup table
-- This change is needed to backup User Requested tire requests that don't have supervisors yet
ALTER TABLE requestbackup MODIFY COLUMN supervisorId INT NULL;
