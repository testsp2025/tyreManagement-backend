// Script to apply the MySQL migration file using credentials from .env
// Usage: from tyreManagement-backend folder run: node ./scripts/applyMigration.js

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

(async () => {
  try {
    const sqlPath = path.resolve(__dirname, '..', 'migrations', '20250827_create_receipts_table_mysql.sql');
    if (!fs.existsSync(sqlPath)) {
      console.error('Migration file not found:', sqlPath);
      process.exit(1);
    }

    const sql = fs.readFileSync(sqlPath, 'utf8');

    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
      multipleStatements: true,
    });

    console.log('Applying migration:', sqlPath);
    await connection.query(sql);
    await connection.end();

    console.log('Migration applied successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err.message || err);
    process.exit(1);
  }
})();
