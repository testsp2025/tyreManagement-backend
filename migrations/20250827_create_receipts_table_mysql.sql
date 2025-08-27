-- MySQL-compatible migration to create receipts and receipt_items tables
-- Run this against your MySQL database (for example via `mysql -u user -p database < this_file.sql`)

SET FOREIGN_KEY_CHECKS=0;

CREATE TABLE IF NOT EXISTS `receipts` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `receipt_number` VARCHAR(64) NOT NULL UNIQUE,
  `request_id` INT NULL,
  `supplier_name` VARCHAR(255) NULL,
  `vehicle_number` VARCHAR(128) NULL,
  `vehicle_brand` VARCHAR(128) NULL,
  `vehicle_model` VARCHAR(128) NULL,
  `subtotal` DECIMAL(12,2) DEFAULT 0.00,
  `tax` DECIMAL(12,2) DEFAULT 0.00,
  `discount` DECIMAL(12,2) DEFAULT 0.00,
  `total` DECIMAL(12,2) DEFAULT 0.00,
  `customer_officer_name` VARCHAR(255) NULL,
  `company_name` VARCHAR(255) NULL,
  `company_address` VARCHAR(512) NULL,
  `notes` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_receipts_request_id` (`request_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `receipt_items` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `receipt_id` INT NOT NULL,
  `description` VARCHAR(512) NULL,
  `quantity` INT DEFAULT 1,
  `unit_price` DECIMAL(12,2) DEFAULT 0.00,
  `total_price` DECIMAL(12,2) DEFAULT 0.00,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_receipt_items_receipt_id` (`receipt_id`),
  CONSTRAINT `fk_receipt_items_receipt` FOREIGN KEY (`receipt_id`) REFERENCES `receipts`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Optional foreign key to requests table if it exists in your schema
-- Uncomment the following lines if `requests(id)` exists and you want the FK constraint
-- ALTER TABLE `receipts` ADD CONSTRAINT `fk_receipts_request` FOREIGN KEY (`request_id`) REFERENCES `requests`(`id`) ON DELETE SET NULL;

SET FOREIGN_KEY_CHECKS=1;
