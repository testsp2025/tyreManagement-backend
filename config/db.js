require("dotenv").config();
const mysql = require("mysql2/promise");
const { Sequelize } = require("sequelize");

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  database: process.env.DB_NAME,
  password: process.env.DB_PASS,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST,
    dialect: "mysql",
    logging: false,
  }
);

const syncAndAlterDatabase = async () => {
  try {
    const connection = await pool.getConnection();
    console.log("Connected to the database for schema alteration.");

    // Check if requests table exists before altering
    const [tables] = await connection.query(
      "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'requests'",
      [process.env.DB_NAME]
    );

    if (tables.length > 0) {
      // Check if status column exists and its current type
      const [columns] = await connection.query(
        "SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'requests' AND COLUMN_NAME = 'status'",
        [process.env.DB_NAME]
      );

      if (columns.length > 0) {
        const column = columns[0];
        if (
          column.DATA_TYPE !== "varchar" ||
          column.CHARACTER_MAXIMUM_LENGTH < 50
        ) {
          await connection.query(
            "ALTER TABLE requests MODIFY COLUMN status VARCHAR(50);"
          );
          console.log(
            "Successfully altered 'requests' table: 'status' column is now VARCHAR(50)."
          );
        } else {
          console.log("Schema already correct - status column is VARCHAR(50).");
        }
      } else {
        console.log(
          "Status column doesn't exist yet - will be created by Sequelize."
        );
      }
    } else {
      console.log(
        "Requests table doesn't exist yet - will be created by Sequelize."
      );
    }

    connection.release();
  } catch (error) {
    console.error("Failed to alter database schema:", error);
    // Don't exit the process - let Sequelize handle table creation
    console.log("Continuing with Sequelize sync...");
  }
};

module.exports = { pool, sequelize, syncAndAlterDatabase };
