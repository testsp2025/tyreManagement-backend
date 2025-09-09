/**
 * Debug script for deletion issues
 * This helps identify why deletions are failing
 */

require('dotenv').config();
const { pool } = require('../config/db');

async function debugDeletion() {
  console.log('🔍 DEBUGGING DELETION FUNCTIONALITY');
  console.log('=====================================\n');
  
  try {
    // Test 1: Check database connection
    console.log('1️⃣ Testing database connection...');
    const connection = await pool.getConnection();
    console.log('✅ Database connection successful');
    connection.release();
    
    // Test 2: Check if requestbackup table exists
    console.log('\n2️⃣ Checking requestbackup table...');
    const [tables] = await pool.query(
      "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'requestbackup'"
    );
    
    if (tables.length === 0) {
      console.log('❌ requestbackup table DOES NOT exist');
      console.log('💡 You need to run the main soft delete migration first');
      console.log('💡 Run: node scripts/run-migration.js (if local) or apply the SQL manually on Railway');
      return;
    } else {
      console.log('✅ requestbackup table exists');
    }
    
    // Test 3: Check requestbackup table structure
    console.log('\n3️⃣ Checking requestbackup table structure...');
    const [columns] = await pool.query('DESCRIBE requestbackup');
    console.log(`📊 requestbackup has ${columns.length} columns:`);
    
    const columnNames = columns.map(col => col.Field);
    console.log('📋 Columns:', columnNames.join(', '));
    
    // Check for deletedByRole column specifically
    const hasRoleColumn = columnNames.includes('deletedByRole');
    console.log(`🎭 deletedByRole column: ${hasRoleColumn ? '✅ EXISTS' : '❌ MISSING'}`);
    
    // Test 4: Check if requests table exists and has data
    console.log('\n4️⃣ Checking requests table...');
    const [requestCount] = await pool.query('SELECT COUNT(*) as count FROM requests');
    console.log(`📊 Total requests in main table: ${requestCount[0].count}`);
    
    if (requestCount[0].count === 0) {
      console.log('⚠️  No requests available for testing deletion');
    } else {
      // Get sample request
      const [sampleRequest] = await pool.query('SELECT id, vehicleNumber, status FROM requests LIMIT 1');
      console.log('📋 Sample request:', sampleRequest[0]);
    }
    
    // Test 5: Check backup table data
    console.log('\n5️⃣ Checking backup table data...');
    const [backupCount] = await pool.query('SELECT COUNT(*) as count FROM requestbackup');
    console.log(`📊 Total requests in backup table: ${backupCount[0].count}`);
    
    if (backupCount[0].count > 0) {
      const [sampleBackup] = await pool.query('SELECT id, vehicleNumber, deletedAt, deletedBy FROM requestbackup ORDER BY deletedAt DESC LIMIT 1');
      console.log('📋 Latest deleted request:', sampleBackup[0]);
    }
    
    // Test 6: Test a simple insert into requestbackup
    console.log('\n6️⃣ Testing backup table insert capability...');
    try {
      const testData = {
        id: 99999, // Use a high ID that won't conflict
        userId: 1,
        vehicleId: 1,
        vehicleNumber: 'TEST001',
        quantity: 1,
        tubesQuantity: 1,
        tireSize: 'Test Size',
        requestReason: 'Test deletion debug',
        requesterName: 'Test User',
        requesterEmail: 'test@example.com',
        requesterPhone: '1234567890',
        vehicleBrand: 'Test Brand',
        vehicleModel: 'Test Model',
        lastReplacementDate: '2024-01-01',
        existingTireMake: 'Test Make',
        tireSizeRequired: 'Test Size Required',
        presentKmReading: 10000,
        previousKmReading: 5000,
        tireWearPattern: 'Test Pattern',
        status: 'pending',
        submittedAt: new Date(),
        supervisorId: 1,
        deletedAt: new Date(),
        deletedBy: 1
      };
      
      // Add deletedByRole only if column exists
      if (hasRoleColumn) {
        testData.deletedByRole = 'user';
      }
      
      const fields = Object.keys(testData);
      const values = Object.values(testData);
      const placeholders = fields.map(() => '?').join(', ');
      const fieldNames = fields.join(', ');
      
      await pool.query(
        `INSERT INTO requestbackup (${fieldNames}) VALUES (${placeholders})`,
        values
      );
      
      console.log('✅ Test insert successful');
      
      // Clean up test data
      await pool.query('DELETE FROM requestbackup WHERE id = 99999');
      console.log('✅ Test data cleaned up');
      
    } catch (insertError) {
      console.log('❌ Test insert failed:', insertError.message);
      console.log('💡 This indicates a schema mismatch or missing columns');
    }
    
    console.log('\n📊 DIAGNOSIS SUMMARY:');
    console.log('====================');
    
    if (tables.length === 0) {
      console.log('🚨 MAIN ISSUE: requestbackup table missing');
      console.log('📝 SOLUTION: Run the main soft delete migration');
    } else if (!hasRoleColumn) {
      console.log('⚠️  MINOR ISSUE: deletedByRole column missing');
      console.log('📝 SOLUTION: Run node scripts/railway-add-role-column.js');
      console.log('💡 WORKAROUND: Deletion should still work without role tracking');
    } else {
      console.log('✅ Database structure looks good');
      console.log('💡 If deletion still fails, check:');
      console.log('   - Network connectivity');
      console.log('   - Browser console for frontend errors');
      console.log('   - Backend logs for detailed error messages');
    }
    
  } catch (error) {
    console.error('💥 Debug script failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the debug script
if (require.main === module) {
  debugDeletion()
    .then(() => {
      console.log('\n🏁 Debug script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Debug script error:', error);
      process.exit(1);
    });
}

module.exports = debugDeletion;