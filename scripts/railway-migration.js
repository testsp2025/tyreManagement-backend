/**
 * Railway Database Migration Script
 * This script creates the backup tables needed for soft delete functionality
 * Designed to work with Railway's hosted MySQL database
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

async function migrateToRailway() {
  let connection;
  
  try {
    console.log('🚂 Starting Railway database migration...');
    console.log('📡 Connecting to Railway MySQL database...');
    
    // Create connection to Railway database
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT || 3306,
      ssl: {
        rejectUnauthorized: false // Railway requires SSL but with flexible certificate validation
      }
    });
    
    console.log('✅ Connected to Railway database successfully');
    
    // Check if backup table already exists
    console.log('🔍 Checking if requestbackup table already exists...');
    const [existingTables] = await connection.query(
      "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'requestbackup'",
      [process.env.DB_NAME]
    );
    
    if (existingTables.length > 0) {
      console.log('⚠️  requestbackup table already exists');
      console.log('✨ Migration already completed - no action needed');
      return;
    }
    
    console.log('📋 Creating requestbackup table...');
    
    // Create the backup table
    const createTableSQL = `
      CREATE TABLE requestbackup (
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
      )
    `;
    
    await connection.execute(createTableSQL);
    console.log('✅ requestbackup table created successfully');
    
    // Verify table creation
    const [verifyTables] = await connection.query(
      "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'requestbackup'",
      [process.env.DB_NAME]
    );
    
    if (verifyTables.length > 0) {
      console.log('🎯 Migration completed successfully!');
      
      // Get table info
      const [columns] = await connection.query("DESCRIBE requestbackup");
      console.log(`📊 requestbackup table created with ${columns.length} columns`);
      
      // Show some key columns
      console.log('🔑 Key columns added:');
      console.log('   • deletedAt (tracks deletion time)');
      console.log('   • deletedBy (tracks who deleted)');
      console.log('   • All original request fields preserved');
      
      console.log('');
      console.log('🚀 Soft delete functionality is now active!');
      console.log('   • Delete requests will be moved to requestbackup table');
      console.log('   • Use GET /api/requests/deleted to view deleted requests');
      console.log('   • Use POST /api/requests/restore/:id to restore requests');
      
    } else {
      throw new Error('Table creation verification failed');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    
    // Provide specific Railway troubleshooting
    if (error.code === 'ENOTFOUND') {
      console.log('💡 Railway connection issue:');
      console.log('   • Check your DATABASE_URL in Railway dashboard');
      console.log('   • Ensure DB_HOST, DB_USER, DB_PASS are correct in .env');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('💡 Authentication issue:');
      console.log('   • Verify database credentials in Railway dashboard');
      console.log('   • Check DB_USER and DB_PASS environment variables');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('💡 Connection refused:');
      console.log('   • Railway database might be starting up');
      console.log('   • Check Railway service status');
    } else if (error.sqlMessage) {
      console.log('💡 SQL Error:', error.sqlMessage);
    }
    
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔚 Database connection closed');
    }
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrateToRailway()
    .then(() => {
      console.log('🎉 Railway migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error.message);
      process.exit(1);
    });
}

module.exports = { migrateToRailway };