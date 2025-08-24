require('dotenv').config();
const { pool } = require('../config/db');

async function up() {
  try {
    await pool.query("ALTER TABLE requests MODIFY COLUMN status VARCHAR(50)");
    console.log("Migration successful: 'status' column in 'requests' table updated.");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

up();