require('dotenv').config();
const mysql = require('mysql2/promise');

async function applyMigration() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME
    });

    try {
        console.log('Starting migration...');
        
        // Disable foreign key checks
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');
        
        // Drop the receipts table
        await connection.query('DROP TABLE IF EXISTS receipts');
        
        // Re-enable foreign key checks
        await connection.query('SET FOREIGN_KEY_CHECKS = 1');
        
        console.log('Migration completed successfully!');
    } catch (error) {
        console.error('Error during migration:', error);
        throw error;
    } finally {
        await connection.end();
    }
}

applyMigration()
    .then(() => {
        console.log('Migration process finished');
        process.exit(0);
    })
    .catch((err) => {
        console.error('Migration failed:', err);
        process.exit(1);
    });
