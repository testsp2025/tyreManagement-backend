require('dotenv').config();
const mysql = require('mysql2/promise');

async function dropTable() {
    // Create the connection using the Railway database URL format
    const connection = await mysql.createConnection({
        host: process.env.MYSQL_URL || process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 3306,
        ssl: {
            rejectUnauthorized: true
        }
    });

    try {
        console.log('Connected to database, attempting to drop receipts table...');
        
        // First drop foreign key constraints
        const [constraints] = await connection.query(`
            SELECT CONSTRAINT_NAME 
            FROM information_schema.KEY_COLUMN_USAGE 
            WHERE TABLE_SCHEMA = ? 
            AND TABLE_NAME = 'receipts' 
            AND REFERENCED_TABLE_NAME IS NOT NULL`, [process.env.DB_NAME]);
        
        for (const constraint of constraints) {
            await connection.query(`ALTER TABLE receipts DROP FOREIGN KEY ${constraint.CONSTRAINT_NAME}`);
            console.log(`Dropped foreign key: ${constraint.CONSTRAINT_NAME}`);
        }

        // Then drop the table
        await connection.query('DROP TABLE IF EXISTS receipts');
        console.log('Successfully dropped receipts table');
        
    } catch (error) {
        console.error('Error:', error);
        throw error;
    } finally {
        await connection.end();
    }
}

dropTable()
    .then(() => {
        console.log('Operation completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Operation failed:', error);
        process.exit(1);
    });
