require("dotenv").config();

// Validate required environment variables
const requiredEnvVars = ["DB_HOST", "DB_USER", "DB_PASS", "DB_NAME"];
const missingEnvVars = requiredEnvVars.filter(
  (varName) => !process.env[varName]
);

if (missingEnvVars.length > 0) {
  console.error("Missing required environment variables:", missingEnvVars);
  console.log("Server will start but database functionality may not work.");
}

const app = require("./app");
const { sequelize, pool } = require("./config/db"); // Correct import
require("./models"); // Loads all models and associations
// const requestRoutes = require("./routes/requestRoutes"); // Removed - routes handled in app.js
// const vehicleRoutes = require("./routes/vehicleRoutes"); // Removed - routes handled in app.js
// const sseRoutes = require("./routes/sseRoutes"); // Disabled
// const websocketService = require("./services/websocketService"); // Disabled
const http = require("http");

const port = process.env.PORT || 5000;

// Import models so they are registered
require("./models/User");
require("./models/Vehicle");
require("./models/Request");
require("./models/RequestImage");
require("./models/TireDetails");
require("./models/Supplier");

// Test database connection
async function testDbConnection() {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    console.log("MySQL pool connection has been established successfully.");
  } catch (error) {
    console.error("Unable to connect to the MySQL pool:", error);
    throw error; // Let the caller handle the error
  }
}

// Routes are already defined in app.js, no need to mount them again here
// app.use("/api", requestRoutes); // Removed - already mounted in app.js
// app.use("/api", vehicleRoutes); // Removed - already mounted in app.js
// app.use("/api/sse", sseRoutes); // Disabled

// Create HTTP server
const server = http.createServer(app);

// WebSocket disabled for Railway compatibility
// websocketService.initialize(server);

// Start server
server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
  console.log(`WebSocket server initialized`);

  // Initialize database after server starts
  initializeDatabase();
});

// Initialize database function
async function initializeDatabase() {
  try {
    console.log("Initializing database...");

    // Test database connection
    await testDbConnection();

    // Sync models
    await sequelize.sync({ alter: true });
    console.log("Database & tables synced!");
  } catch (error) {
    console.error("Database initialization failed:", error);
    // Don't exit the process - server can still handle health checks
    console.log("Server will continue running without database...");
  }
}
