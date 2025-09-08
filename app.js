const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const passport = require("./middleware/azureAuth");
const { syncAndAlterDatabase } = require("./config/db");

const app = express();

// Sync and alter database schema before starting the server
// Don't block server startup if this fails
syncAndAlterDatabase().catch((error) => {
  console.error("Database schema alteration failed:", error);
  console.log("Server will continue starting...");
});

// CORS Configuration
const corsOptions = {
  origin: [
    "https://tyre-management-frontend.vercel.app",
    "https://tyremanagement-frontend.vercel.app",
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:4173",
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Origin",
    "X-Requested-With",
    "Content-Type",
    "Accept",
    "Authorization",
    "Cache-Control",
  ],
  credentials: true,
  optionsSuccessStatus: 200,
};

// Middleware
app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // Enable preflight for all routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use("/uploads", express.static(uploadDir));

// Routes
app.use("/api/vehicles", require("./routes/vehicleRoutes"));
app.use("/api/requests", require("./routes/requestRoutes"));
app.use("/api/suppliers", require("./routes/supplierRoutes"));
app.use("/api/tire-details", require("./routes/tireDetailsRoutes"));
const userRoutes = require("./routes/userRoutes");
app.use("/api/users", userRoutes);

// Migration endpoint
const { runMigration } = require('./controllers/migrationController');
app.post('/api/migrate-status', runMigration);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Server is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

app.get(
  "/api/azure-protected",
  passport.authenticate("oauth-bearer", { session: false }),
  (req, res) => {
    // Ensure we send all necessary user fields
    const { id, azure_id, email, name, role, costCentre, department } = req.user;
    res.json({
      user: {
        id,
        azure_id,
        email,
        name,
        role,
        costCentre: costCentre || "",
        department: department || ""
      }
    });
  }
);

// 404 handler for undefined routes
app.use((req, res, next) => {
  res.status(404).json({ error: "Route not found" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

module.exports = app;
