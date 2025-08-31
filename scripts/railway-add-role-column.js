/**
 * Railway-compatible script to add deletedByRole column to requestbackup table
 * This script can be run on Railway deployment or manually
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

async function addRoleColumn() {
  let connection;
  
  try {
    console.log('🚂 Starting Railway role column migration...');
    console.log('📡 Connecting to Railway MySQL database...');
    
    // Create connection to Railway database
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'mysql.railway.internal',
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT || 3306,
      ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false
      } : false
    });
    
    console.log('✅ Connected to Railway database successfully');
    
    // Check if deletedByRole column already exists
    console.log('🔍 Checking if deletedByRole column already exists...');
    const [existingColumns] = await connection.query(
      `SELECT COLUMN_NAME 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = ? 
       AND TABLE_NAME = 'requestbackup' 
       AND COLUMN_NAME = 'deletedByRole'`,
      [process.env.DB_NAME]
    );
    
    if (existingColumns.length > 0) {
      console.log('⚠️  deletedByRole column already exists');
      console.log('✅ Migration not needed - column is already present');
      return;
    }
    
    // Check if requestbackup table exists
    console.log('🔍 Checking if requestbackup table exists...');
    const [existingTables] = await connection.query(
      "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'requestbackup'",
      [process.env.DB_NAME]
    );
    
    if (existingTables.length === 0) {
      console.log('❌ requestbackup table does not exist');
      console.log('💡 Please run the main soft delete migration first');
      return;
    }
    
    console.log('✅ requestbackup table exists, proceeding with column addition...');
    
    // Add the deletedByRole column
    console.log('🔧 Adding deletedByRole column...');
    await connection.query(`
      ALTER TABLE requestbackup 
      ADD COLUMN deletedByRole VARCHAR(50) NULL 
      AFTER deletedBy
    `);
    
    console.log('✅ deletedByRole column added successfully');
    
    // Add index for performance
    console.log('📊 Creating index for deletedByRole column...');
    try {
      await connection.query(`
        CREATE INDEX idx_deleted_by_role ON requestbackup (deletedByRole)
      `);
      console.log('✅ Index created successfully');
    } catch (indexError) {
      if (indexError.message.includes('Duplicate key name')) {
        console.log('⚠️  Index already exists, skipping...');
      } else {
        console.warn('⚠️  Could not create index:', indexError.message);
      }
    }
    
    // Verify the column was added
    console.log('🔍 Verifying column addition...');
    const [verifyColumns] = await connection.query(
      `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = ? 
       AND TABLE_NAME = 'requestbackup' 
       AND COLUMN_NAME = 'deletedByRole'`,
      [process.env.DB_NAME]
    );
    
    if (verifyColumns.length > 0) {
      console.log('✅ Column verification successful:');
      console.log(`   - Column: ${verifyColumns[0].COLUMN_NAME}`);
      console.log(`   - Type: ${verifyColumns[0].DATA_TYPE}`);
      console.log(`   - Nullable: ${verifyColumns[0].IS_NULLABLE}`);
    } else {
      console.log('❌ Column verification failed');
    }
    
    console.log('🎉 Role column migration completed successfully!');
    console.log('💡 The application now supports role-based deletion tracking');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Stack trace:', error.stack);
    
    if (error.code === 'ENOTFOUND') {
      console.log('💡 Connection failed - make sure you are running this on Railway or have correct DB credentials');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('💡 Access denied - check your database credentials in .env file');
    } else if (error.message.includes('Unknown column')) {
      console.log('💡 Column reference error - the requestbackup table structure may be different than expected');
    }
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the migration
if (require.main === module) {
  addRoleColumn()
    .then(() => {
      console.log('🏁 Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = addRoleColumn;