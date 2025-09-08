-- Migration: Make supervisorId nullable in requestbackup
-- Allows archiving requests that don't have an assigned supervisor (e.g., 'User Requested tire')
-- Run this against your database to allow DELETE /api/requests/:id to back up pending requests.

ALTER TABLE requestbackup
  MODIFY COLUMN supervisorId INT NULL;

-- If your DB also defines a foreign key constraint on supervisorId, you may need to drop and recreate it.
-- Example (uncomment and adjust constraint name if needed):
-- ALTER TABLE requestbackup DROP FOREIGN KEY fk_requestbackup_supervisor;
-- ALTER TABLE requestbackup ADD CONSTRAINT fk_requestbackup_supervisor FOREIGN KEY (supervisorId) REFERENCES users(id) ON DELETE SET NULL;
