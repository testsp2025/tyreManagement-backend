# Deletion Troubleshooting Guide

## Issue Summary
You reported two main problems:
1. **Database tables missing new column** - The `deletedByRole` column hasn't been added
2. **Cannot delete requests** - The deletion functionality is not working

## Root Cause Analysis

Based on the code analysis, the most likely causes are:

### 1. Missing `requestbackup` Table
The soft delete functionality requires a backup table that may not exist yet in your database.

### 2. Missing `deletedByRole` Column
The enhanced role tracking requires a new column that hasn't been added yet.

### 3. Schema Mismatch
If tables exist but have different structures, insertions will fail.

## Solutions (Choose Based on Your Environment)

### 🚀 **Solution A: Railway Production Database**

If you're working with the Railway production database, you need to run SQL commands directly on Railway:

#### Step 1: Check if requestbackup table exists
```sql
SELECT TABLE_NAME 
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'requestbackup';
```

#### Step 2A: If requestbackup table DOESN'T exist, create it:
```sql
-- Create the main backup table
CREATE TABLE IF NOT EXISTS requestbackup (
  id INT PRIMARY KEY,
  userId INT NOT NULL,
  vehicleId INT NOT NULL,
  vehicleNumber VARCHAR(50) NOT NULL,
  quantity INT NOT NULL,
  tubesQuantity INT NOT NULL,
  tireSize VARCHAR(50) NOT NULL,
  requestReason TEXT NOT NULL,
  requesterName VARCHAR(100) NOT NULL,
  requesterEmail VARCHAR(100) NOT NULL,
  requesterPhone VARCHAR(20) NOT NULL,
  vehicleBrand VARCHAR(50) NOT NULL,
  vehicleModel VARCHAR(50) NOT NULL,
  lastReplacementDate DATE NOT NULL,
  existingTireMake VARCHAR(100) NOT NULL,
  tireSizeRequired VARCHAR(50) NOT NULL,
  presentKmReading INT NOT NULL,
  previousKmReading INT NOT NULL,
  tireWearPattern VARCHAR(100) NOT NULL,
  comments TEXT,
  status ENUM(
    'pending',
    'supervisor approved',
    'technical-manager approved',
    'engineer approved',
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
  ) DEFAULT 'pending',
  submittedAt DATETIME NOT NULL,
  supervisor_notes TEXT,
  technical_manager_note TEXT,
  engineer_note TEXT,
  customer_officer_note TEXT,
  supervisorId INT NOT NULL,
  technical_manager_id INT,
  supervisor_decision_by INT,
  engineer_decision_by INT,
  customer_officer_decision_by INT,
  deliveryOfficeName VARCHAR(100),
  deliveryStreetName VARCHAR(255),
  deliveryTown VARCHAR(100),
  totalPrice DECIMAL(10, 2),
  warrantyDistance INT,
  tireWearIndicatorAppeared BOOLEAN DEFAULT FALSE,
  Department VARCHAR(100),
  CostCenter VARCHAR(100),
  supplierName VARCHAR(255),
  supplierEmail VARCHAR(255),
  supplierPhone VARCHAR(255),
  orderNumber VARCHAR(255),
  orderNotes TEXT,
  orderPlacedDate DATETIME,
  deletedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deletedBy INT,
  deletedByRole VARCHAR(50) NULL,
  INDEX idx_deleted_at (deletedAt),
  INDEX idx_original_id (id),
  INDEX idx_vehicle_number (vehicleNumber),
  INDEX idx_deleted_by_role (deletedByRole)
);
```

#### Step 2B: If requestbackup table EXISTS but missing deletedByRole column:
```sql
-- Check if deletedByRole column exists
SELECT COLUMN_NAME 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'requestbackup' 
AND COLUMN_NAME = 'deletedByRole';

-- If the above returns no results, add the column:
ALTER TABLE requestbackup 
ADD COLUMN deletedByRole VARCHAR(50) NULL 
AFTER deletedBy;

-- Add index for performance
CREATE INDEX idx_deleted_by_role ON requestbackup (deletedByRole);
```

### 🛠️ **Solution B: Local Development**

If you're working locally, you can use the scripts:

```bash
# Run the debug script to identify issues
node test/debug-deletion.js

# If requestbackup table is missing, create it
node scripts/run-migration.js

# If only deletedByRole column is missing, add it
node scripts/railway-add-role-column.js
```

### 🔧 **Solution C: Alternative Deployment Method**

If you can't access Railway database directly, you can:

1. **Add the migration to your deployment process**
2. **Create a web endpoint that runs the migration**
3. **Use Railway's database console if available**

## Testing the Fix

### 1. Test Deletion Functionality
After applying the database changes:

1. **Open browser console** while on any dashboard
2. **Try to delete a request**
3. **Check for errors** in both browser console and network tab
4. **Look for success message** "Request deleted successfully and moved to backup"

### 2. Verify Database Changes
```sql
-- Check if deletion worked
SELECT COUNT(*) as backup_count FROM requestbackup;

-- Check recent deletions
SELECT id, vehicleNumber, deletedAt, deletedBy, deletedByRole 
FROM requestbackup 
ORDER BY deletedAt DESC 
LIMIT 5;
```

### 3. Test Deleted Requests Page
1. **Navigate to "Deleted Requests"** page from any dashboard
2. **Check if deleted requests appear**
3. **Test filtering by role** (if column exists)
4. **Test restore functionality**

## Error Diagnosis

### Common Error Messages and Solutions:

#### ❌ "Table 'requestbackup' doesn't exist"
**Solution:** Run the main table creation SQL from Solution A, Step 2A

#### ❌ "Unknown column 'deletedByRole'"
**Solution:** Run the column addition SQL from Solution A, Step 2B

#### ❌ "Failed to delete request"
**Check:**
- Browser network tab for HTTP status codes
- Railway logs for detailed error messages
- Database connection issues

#### ❌ "Request not found"
**Check:**
- The request ID being passed
- User permissions
- Whether request was already deleted

## Updated Code Features

The latest code includes:

✅ **Backward Compatibility** - Works without deletedByRole column
✅ **Dynamic Column Detection** - Checks if column exists before using it
✅ **Graceful Degradation** - Shows "Not tracked" instead of errors
✅ **Enhanced Logging** - Better error messages for debugging

## Manual Database Access for Railway

If you need to access Railway database directly:

1. **Railway Dashboard** → Your Project → Database
2. **Connect** tab → Copy connection details
3. **Use MySQL Workbench, phpMyAdmin, or command line**:
   ```bash
   mysql -h [hostname] -u [username] -p -P [port] [database_name]
   ```

## Quick Status Check

To quickly check current status, run these SQL queries on your database:

```sql
-- 1. Check if backup table exists
SHOW TABLES LIKE 'requestbackup';

-- 2. Check backup table structure
DESCRIBE requestbackup;

-- 3. Check current data
SELECT 
  (SELECT COUNT(*) FROM requests) as active_requests,
  (SELECT COUNT(*) FROM requestbackup) as deleted_requests;
```

## Contact Support

If issues persist after trying these solutions:

1. **Share the exact error messages** from browser console
2. **Provide Railway backend logs** if accessible
3. **Confirm which SQL statements you've run**
4. **Test with a simple request deletion** and share results

The enhanced deletion system is now designed to work even without the role column, so basic deletion should work once the main `requestbackup` table exists.