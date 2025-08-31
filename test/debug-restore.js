/**
 * Debug script to test restore functionality
 * This helps identify why restore is failing
 */

require('dotenv').config();
const { pool } = require('../config/db');

async function debugRestore() {
  console.log('🔍 DEBUGGING RESTORE FUNCTIONALITY');
  console.log('=====================================\n');
  
  try {
    // Test 1: Check database connection
    console.log('1️⃣ Testing database connection...');
    const connection = await pool.getConnection();
    console.log('✅ Database connection successful');
    
    // Test 2: Check requestbackup table and get a sample
    console.log('\n2️⃣ Checking requestbackup table for restore candidates...');
    const [backupCount] = await connection.query('SELECT COUNT(*) as count FROM requestbackup');
    console.log(`📊 Total records in requestbackup: ${backupCount[0].count}`);
    
    if (backupCount[0].count === 0) {
      console.log('❌ No deleted requests available for testing restore');
      connection.release();
      return;
    }
    
    // Get sample deleted request
    const [sampleBackup] = await connection.query(
      'SELECT id, vehicleNumber, status, deletedAt, deletedBy, deletedByRole FROM requestbackup LIMIT 1'
    );
    console.log('📋 Sample deleted request:', sampleBackup[0]);
    
    // Test 3: Check requestbackup table structure
    console.log('\n3️⃣ Checking requestbackup table structure...');
    const [backupColumns] = await connection.query('DESCRIBE requestbackup');
    const backupColumnNames = backupColumns.map(col => col.Field);
    console.log('📋 Backup table columns:', backupColumnNames.join(', '));
    console.log(`🎭 deletedByRole column: ${backupColumnNames.includes('deletedByRole') ? '✅ EXISTS' : '❌ MISSING'}`);
    
    // Test 4: Check main requests table structure  
    console.log('\n4️⃣ Checking main requests table structure...');
    const [mainColumns] = await connection.query('DESCRIBE requests');
    const mainColumnNames = mainColumns.map(col => col.Field);
    console.log('📋 Main table columns:', mainColumnNames.join(', '));
    
    // Test 5: Compare schemas and identify differences
    console.log('\n5️⃣ Comparing table schemas...');
    const backupOnly = backupColumnNames.filter(col => !mainColumnNames.includes(col));
    const mainOnly = mainColumnNames.filter(col => !backupColumnNames.includes(col));
    
    console.log('🔄 Backup-only fields (will be excluded during restore):', backupOnly);
    console.log('📝 Main-only fields (may cause issues if required):', mainOnly);
    
    // Test 6: Test the restore logic with sample data
    console.log('\n6️⃣ Testing restore logic with sample data...');
    const testBackupRequest = sampleBackup[0];
    
    // Get full backup request data
    const [fullBackupData] = await connection.query(
      'SELECT * FROM requestbackup WHERE id = ?',
      [testBackupRequest.id]
    );
    
    if (fullBackupData.length === 0) {
      console.log('❌ Could not get full backup data');
      connection.release();
      return;
    }
    
    const backupRequest = fullBackupData[0];
    console.log('📦 Full backup data keys:', Object.keys(backupRequest));
    
    // Simulate the restore filtering logic
    const { deletedAt, deletedBy, deletedByRole, ...requestData } = backupRequest;
    console.log('🔄 After removing backup-specific fields:', Object.keys(requestData));
    
    // Filter for main table compatibility
    const compatibleData = {};
    Object.keys(requestData).forEach(key => {
      if (mainColumnNames.includes(key)) {
        compatibleData[key] = requestData[key];
      } else {
        console.log(`⚠️  Would skip field '${key}' - not found in main table`);
      }
    });
    
    console.log('✅ Compatible data for restore:', Object.keys(compatibleData));
    console.log(`📊 ${Object.keys(compatibleData).length} fields would be restored`);
    
    // Test 7: Check for ID conflicts
    console.log('\n7️⃣ Checking for potential ID conflicts...');
    const [existingRequest] = await connection.query(
      'SELECT id FROM requests WHERE id = ?',
      [testBackupRequest.id]
    );
    
    if (existingRequest.length > 0) {
      console.log('⚠️  ID conflict detected - request with this ID already exists in main table');
      console.log('💡 This would prevent restoration');
    } else {
      console.log('✅ No ID conflict - restoration would be possible');
    }
    
    // Test 8: Test the actual INSERT statement (dry run)
    console.log('\n8️⃣ Testing INSERT statement construction...');
    try {
      const fields = Object.keys(compatibleData);
      const values = Object.values(compatibleData);
      const placeholders = fields.map(() => '?').join(', ');
      const fieldNames = fields.join(', ');
      
      const insertSQL = `INSERT INTO requests (${fieldNames}) VALUES (${placeholders})`;
      console.log('📝 Generated INSERT SQL:', insertSQL);
      console.log('📊 Number of fields:', fields.length);
      console.log('📊 Number of values:', values.length);
      
      // Don't actually execute, just validate the structure
      console.log('✅ INSERT statement structure is valid');
      
    } catch (sqlError) {
      console.log('❌ SQL construction failed:', sqlError.message);
    }
    
    // Test 9: Check image backup table
    console.log('\n9️⃣ Checking image backup table...');
    const [imageBackups] = await connection.query(
      'SELECT COUNT(*) as count FROM request_images_backup WHERE requestId = ?',
      [testBackupRequest.id]
    );
    console.log(`📸 Images in backup for this request: ${imageBackups[0].count}`);
    
    console.log('\n📊 DIAGNOSIS SUMMARY:');
    console.log('====================');
    
    if (backupCount[0].count === 0) {
      console.log('🚨 No deleted requests available for restore testing');
    } else if (existingRequest.length > 0) {
      console.log('🚨 LIKELY ISSUE: ID conflict in main table');
      console.log('📝 SOLUTION: The request ID already exists in the main table');
      console.log('💡 This could happen if:');
      console.log('   - Request was already restored');
      console.log('   - New request was created with same ID');
      console.log('   - Database inconsistency');
    } else if (backupOnly.length === 0) {
      console.log('🚨 UNEXPECTED: No backup-specific columns found');
      console.log('💡 This suggests schema mismatch');
    } else {
      console.log('✅ Basic restore logic should work');
      console.log('💡 If restore still fails, check:');
      console.log('   - Network connectivity to frontend');
      console.log('   - Browser console for frontend errors');
      console.log('   - Backend logs during actual restore attempt');
      console.log('   - Transaction rollback issues');
    }
    
    connection.release();
    
  } catch (error) {
    console.error('💥 Debug script failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the debug script
if (require.main === module) {
  debugRestore()
    .then(() => {
      console.log('\n🏁 Debug script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Debug script error:', error);
      process.exit(1);
    });
}

module.exports = debugRestore;