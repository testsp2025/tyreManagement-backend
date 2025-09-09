/**
 * Auto Migration Script for Railway Deployment
 * This script runs database migrations automatically when the app starts
 * Perfect for Railway environment where local access isn't possible
 */

const { pool } = require('../config/db');

async function autoMigrate() {
  let connection;
  
  try {
    console.log('🔄 [AUTO-MIGRATE] Checking for required database migrations...');
    
    connection = await pool.getConnection();
    console.log('✅ [AUTO-MIGRATE] Connected to Railway database');
    
    // Check if backup table exists
    const [existingTables] = await connection.query(
      `SELECT TABLE_NAME FROM information_schema.TABLES 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'requestbackup'`,
      [process.env.DB_NAME]
    );
    
    if (existingTables.length > 0) {
      console.log('✅ [AUTO-MIGRATE] requestbackup table already exists - skipping migration');
      return { success: true, message: 'Migration already completed' };
    }
    
    console.log('📊 [AUTO-MIGRATE] Creating requestbackup table...');
    
    // Create backup table
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
        INDEX idx_deleted_at (deletedAt),
        INDEX idx_original_id (id),
        INDEX idx_vehicle_number (vehicleNumber)
      )
    `;
    
    await connection.query(createTableSQL);
    console.log('✅ [AUTO-MIGRATE] requestbackup table created successfully');
    
    // Verify creation
    const [verifyTables] = await connection.query(
      `SELECT TABLE_NAME FROM information_schema.TABLES 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'requestbackup'`,
      [process.env.DB_NAME]
    );
    
    if (verifyTables.length > 0) {
      console.log('🎯 [AUTO-MIGRATE] Migration completed successfully!');
      console.log('🚀 [AUTO-MIGRATE] Soft delete functionality is now active');
      return { success: true, message: 'Migration completed successfully' };
    } else {
      throw new Error('Table creation verification failed');
    }
    
  } catch (error) {
    console.error('❌ [AUTO-MIGRATE] Migration failed:', error.message);
    
    // Don't crash the app if migration fails - just log the error
    console.log('⚠️  [AUTO-MIGRATE] App will continue without soft delete functionality');
    return { success: false, message: error.message };
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

module.exports = { autoMigrate };