/**
 * Migration script to create backup tables for soft delete functionality
 * Run this script to set up the required database tables
 */

require('dotenv').config();
const { pool } = require('../config/db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  let connection;
  
  try {
    console.log('🔄 Starting backup table migration...');
    
    // Get database connection
    connection = await pool.getConnection();
    console.log('✅ Connected to database');
    
    // Read migration SQL
    const migrationPath = path.join(__dirname, '../migrations/20250830_create_request_backup_table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute migration
    console.log('📊 Creating requestbackup table...');
    await connection.query(migrationSQL);
    console.log('✅ requestbackup table created successfully');
    
    // Verify table creation
    const [tables] = await connection.query("SHOW TABLES LIKE 'requestbackup'");
    if (tables.length > 0) {
      console.log('✅ Migration completed successfully');
      console.log('🎯 Backup table is ready for soft delete operations');
      
      // Show table structure
      const [columns] = await connection.query("DESCRIBE requestbackup");
      console.log(`📋 Table has ${columns.length} columns`);
    } else {
      console.error('❌ Migration failed - table not found');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    
    // Provide helpful error messages
    if (error.code === 'ENOTFOUND') {
      console.log('💡 Tip: Make sure your database connection settings in .env are correct');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('💡 Tip: Check your database username and password in .env');
    } else if (error.sqlMessage) {
      console.log('💡 SQL Error:', error.sqlMessage);
    }
    
    process.exit(1);
  } finally {
    if (connection) {
      connection.release();
      console.log('🔚 Database connection released');
    }
  }
}

// Check if this file is being run directly
if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('🚀 Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Unexpected error:', error);
      process.exit(1);
    });
}

module.exports = { runMigration };