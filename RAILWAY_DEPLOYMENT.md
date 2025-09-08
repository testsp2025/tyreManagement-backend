# Railway Deployment Guide - Soft Delete Migration

## 🚂 Railway Database Migration Steps

Since local database connection to Railway isn't possible, here are the deployment options:

### Option 1: Auto-Migration on App Start (Recommended)
Your app is now configured to automatically create the backup table when it starts on Railway.

**Steps:**
1. **Deploy your updated code to Railway**
2. **The migration will run automatically** when your app starts
3. **Check the logs** to confirm migration success

**What happens:**
- App starts and connects to Railway database
- Auto-migration script runs automatically
- Creates `requestbackup` table if it doesn't exist
- Logs success/failure in Railway console

### Option 2: Manual Migration via Railway CLI

If you have Railway CLI installed:

```bash
# 1. Login to Railway
railway login

# 2. Link to your project
railway link

# 3. Run migration command
railway run npm run migrate
```

### Option 3: Direct Database Access

If you have database client access:

1. **Get Database URL from Railway Dashboard:**
   - Go to your Railway project
   - Click on your database service
   - Copy the connection string

2. **Connect using MySQL client and run:**
```sql
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
    'User Requested tire',
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
  ) DEFAULT 'User Requested tire',
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
  INDEX idx_deleted_at (deletedAt),
  INDEX idx_original_id (id),
  INDEX idx_vehicle_number (vehicleNumber)
);
```

## ✅ Verification Steps

After migration, verify the functionality:

1. **Check Railway logs** for migration success message
2. **Test soft delete** by deleting a tire request
3. **Check backup endpoints:**
   - `GET /api/requests/deleted` - view deleted requests
   - `POST /api/requests/restore/:id` - restore a request

## 📋 Expected Log Messages

Look for these messages in Railway logs:

```
✅ [AUTO-MIGRATE] Connected to Railway database
📊 [AUTO-MIGRATE] Creating requestbackup table...
✅ [AUTO-MIGRATE] requestbackup table created successfully
🎯 [AUTO-MIGRATE] Migration completed successfully!
🚀 [AUTO-MIGRATE] Soft delete functionality is now active
```

## 🔄 Rollback Plan

If something goes wrong:

```sql
-- Remove the backup table
DROP TABLE IF EXISTS requestbackup;
DROP TABLE IF EXISTS request_images_backup;
```

## 🚀 Deploy Now

Your app is ready to deploy with auto-migration enabled!