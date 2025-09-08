const { pool } = require('../config/db');

async function runMigration(req, res) {
  try {
    console.log('Starting status migration from "pending" to "User Requested tire"...');
    
    const connection = await pool.getConnection();
    
    try {
      // Check current status distribution
      console.log('\n=== Current Status Distribution ===');
      const [statusResults] = await connection.query(`
        SELECT status, COUNT(*) as count 
        FROM requests 
        GROUP BY status 
        ORDER BY count DESC
      `);
      console.log('Requests status distribution:', statusResults);

      const [backupStatusResults] = await connection.query(`
        SELECT status, COUNT(*) as count 
        FROM requestbackup 
        GROUP BY status 
        ORDER BY count DESC
      `);
      console.log('RequestBackup status distribution:', backupStatusResults);

      // Start transaction for safe migration
      await connection.beginTransaction();
      
      try {
        console.log('\n=== Step 1: Adding "User Requested tire" to ENUM for requests table ===');
        await connection.query(`
          ALTER TABLE requests MODIFY status ENUM(
            'pending',
            'User Requested tire',
            'supervisor approved',
            'technical-manager approved', 
            'engineer approved',
            'Engineer Approved',
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
          ) DEFAULT 'User Requested tire'
        `);

        console.log('\n=== Step 2: Updating pending records to "User Requested tire" in requests table ===');
        const [updateResult] = await connection.query(`
          UPDATE requests 
          SET status = 'User Requested tire' 
          WHERE status = 'pending'
        `);
        console.log(`Updated ${updateResult.affectedRows} records in requests table`);

        console.log('\n=== Step 3: Removing "pending" from ENUM for requests table ===');
        await connection.query(`
          ALTER TABLE requests MODIFY status ENUM(
            'User Requested tire',
            'supervisor approved',
            'technical-manager approved',
            'engineer approved', 
            'Engineer Approved',
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
          ) DEFAULT 'User Requested tire'
        `);

        console.log('\n=== Step 4: Updating requestbackup table ENUM ===');
        await connection.query(`
          ALTER TABLE requestbackup MODIFY status ENUM(
            'User Requested tire',
            'supervisor approved',
            'technical-manager approved',
            'engineer approved',
            'Engineer Approved', 
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
          ) DEFAULT 'User Requested tire'
        `);

        console.log('\n=== Step 5: Updating pending records in requestbackup table ===');
        const [backupUpdateResult] = await connection.query(`
          UPDATE requestbackup 
          SET status = 'User Requested tire' 
          WHERE status = 'pending'
        `);
        console.log(`Updated ${backupUpdateResult.affectedRows} records in requestbackup table`);

        // Commit transaction
        await connection.commit();
        console.log('\n✅ Migration completed successfully!');

        // Verify the changes
        console.log('\n=== Verification: Final Status Distribution ===');
        const [finalStatusResults] = await connection.query(`
          SELECT status, COUNT(*) as count 
          FROM requests 
          GROUP BY status 
          ORDER BY count DESC
        `);
        console.log('Final requests status distribution:', finalStatusResults);

        const [finalBackupStatusResults] = await connection.query(`
          SELECT status, COUNT(*) as count 
          FROM requestbackup 
          GROUP BY status 
          ORDER BY count DESC
        `);
        console.log('Final requestbackup status distribution:', finalBackupStatusResults);

        console.log('\n🎉 Status migration completed successfully!');
        console.log('Database schema and data now match the application code.');
        console.log('Deletion functionality should now work properly.');

        res.json({
          success: true,
          message: 'Migration completed successfully',
          results: {
            requestsUpdated: updateResult.affectedRows,
            backupRequestsUpdated: backupUpdateResult.affectedRows,
            finalStatusDistribution: finalStatusResults,
            finalBackupStatusDistribution: finalBackupStatusResults
          }
        });

      } catch (error) {
        // Rollback on error
        await connection.rollback();
        throw error;
      }

    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Full error:', error);
    res.status(500).json({
      success: false,
      message: 'Migration failed',
      error: error.message
    });
  }
}

module.exports = { runMigration };