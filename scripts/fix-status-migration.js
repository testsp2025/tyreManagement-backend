const { sequelize } = require('../config/db');

async function runStatusMigration() {
  try {
    console.log('Starting status migration from "pending" to "User Requested tire"...');
    
    // Check current status distribution
    console.log('\n=== Current Status Distribution ===');
    const [statusResults] = await sequelize.query(`
      SELECT status, COUNT(*) as count 
      FROM requests 
      GROUP BY status 
      ORDER BY count DESC
    `);
    console.table(statusResults);

    const [backupStatusResults] = await sequelize.query(`
      SELECT status, COUNT(*) as count 
      FROM requestbackup 
      GROUP BY status 
      ORDER BY count DESC
    `);
    console.log('\nRequestBackup Status Distribution:');
    console.table(backupStatusResults);

    // Start transaction for safe migration
    const transaction = await sequelize.transaction();
    
    try {
      console.log('\n=== Step 1: Adding "User Requested tire" to ENUM for requests table ===');
      await sequelize.query(`
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
      `, { transaction });

      console.log('\n=== Step 2: Updating pending records to "User Requested tire" in requests table ===');
      const [updateResult] = await sequelize.query(`
        UPDATE requests 
        SET status = 'User Requested tire' 
        WHERE status = 'pending'
      `, { transaction });
      console.log(`Updated ${updateResult.affectedRows} records in requests table`);

      console.log('\n=== Step 3: Removing "pending" from ENUM for requests table ===');
      await sequelize.query(`
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
      `, { transaction });

      console.log('\n=== Step 4: Updating requestbackup table ENUM ===');
      await sequelize.query(`
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
      `, { transaction });

      console.log('\n=== Step 5: Updating pending records in requestbackup table ===');
      const [backupUpdateResult] = await sequelize.query(`
        UPDATE requestbackup 
        SET status = 'User Requested tire' 
        WHERE status = 'pending'
      `, { transaction });
      console.log(`Updated ${backupUpdateResult.affectedRows} records in requestbackup table`);

      // Commit transaction
      await transaction.commit();
      console.log('\n✅ Migration completed successfully!');

      // Verify the changes
      console.log('\n=== Verification: Final Status Distribution ===');
      const [finalStatusResults] = await sequelize.query(`
        SELECT status, COUNT(*) as count 
        FROM requests 
        GROUP BY status 
        ORDER BY count DESC
      `);
      console.table(finalStatusResults);

      const [finalBackupStatusResults] = await sequelize.query(`
        SELECT status, COUNT(*) as count 
        FROM requestbackup 
        GROUP BY status 
        ORDER BY count DESC
      `);
      console.log('\nFinal RequestBackup Status Distribution:');
      console.table(finalBackupStatusResults);

      console.log('\n🎉 Status migration completed successfully!');
      console.log('Database schema and data now match the application code.');
      console.log('Deletion functionality should now work properly.');

    } catch (error) {
      // Rollback on error
      await transaction.rollback();
      throw error;
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run the migration
runStatusMigration();