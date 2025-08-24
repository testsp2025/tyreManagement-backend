ALTER TABLE requests
  ADD COLUMN supervisor_approved BOOLEAN DEFAULT FALSE,
  ADD COLUMN supervisor_notes TEXT,
  ADD COLUMN supervisor_timestamp DATETIME,
  ADD COLUMN technical_manager_approved BOOLEAN DEFAULT FALSE,
  ADD COLUMN technical_manager_notes TEXT,
  ADD COLUMN technical_manager_timestamp DATETIME,
  ADD COLUMN engineer_approved BOOLEAN DEFAULT FALSE,
  ADD COLUMN engineer_notes TEXT,
  ADD COLUMN engineer_timestamp DATETIME,
  ADD COLUMN order_placed BOOLEAN DEFAULT FALSE,
  ADD COLUMN order_timestamp DATETIME,
  ADD COLUMN technical_manager_note TEXT,
  ADD COLUMN engineer_note TEXT,
  ADD COLUMN supervisorId INTEGER NOT NULL,
  ADD CONSTRAINT fk_supervisor FOREIGN KEY (supervisorId) REFERENCES users(id);




  -- add colomn

ALTER TABLE requests ADD COLUMN supervisor_decision_by INT NULL;
ALTER TABLE requests ADD COLUMN engineer_decision_by INT NULL;
ALTER TABLE requests ADD FOREIGN KEY (supervisor_decision_by) REFERENCES users(id);
ALTER TABLE requests ADD FOREIGN KEY (engineer_decision_by) REFERENCES users(id);

ALTER TABLE requests ADD COLUMN technical_manager_id INT NULL;
ALTER TABLE requests ADD FOREIGN KEY (technical_manager_id) REFERENCES users(id);
ALTER TABLE users ADD COLUMN costCentre VARCHAR(100), ADD COLUMN department VARCHAR(100);
ALTER TABLE vehicles DROP COLUMN costCentre, DROP COLUMN department;
