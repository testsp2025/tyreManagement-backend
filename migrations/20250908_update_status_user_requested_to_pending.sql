-- Update any 'User Requested tire' status to 'pending' in main requests table
UPDATE requests SET status = 'pending' WHERE status = 'User Requested tire';

-- Update any 'User Requested tire' status to 'pending' in requestbackup table
UPDATE requestbackup SET status = 'pending' WHERE status = 'User Requested tire';
