import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import db from "./config/db.js";
import userRoutes from "./routes/userRoutes.js";
import { authenticateToken } from "./middleware/authMiddleware.js";
import propertyRoutes from "./routes/propertyRoutes.js";
import unitRoutes from "./routes/unitRoutes.js";
import tenantRoutes from "./routes/tenantRoutes.js";
import leaseRoutes from "./routes/leaseRoutes.js";

dotenv.config();

const app = express();

app.use(cors({
  origin: "http://localhost:5173",
}));

app.use(express.json());


app.use("/api/users", userRoutes);
app.use("/api/properties", propertyRoutes);
app.use("/api/units", unitRoutes);
app.use("/api/tenants", tenantRoutes);
app.use("/api/leases", leaseRoutes);

// Test the API server
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "RentSecure backend is running",
  });
});

// Test a real MySQL query
app.get("/api/db-test", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT DATABASE() AS databaseName, VERSION() AS mysqlVersion"
    );

    res.json({
      success: true,
      message: "MySQL connection successful",
      database: rows[0].databaseName,
      mysqlVersion: rows[0].mysqlVersion,
    });
  } catch (error) {
    console.error("Database test failed:", error.message);

    res.status(500).json({
      success: false,
      message: "Database connection failed",
    });
  }
});

const PORT = process.env.PORT || 5000;


app.get("/api/schema-test", async (req, res) => {
  try {
    const [rows] = await db.query("SHOW TABLES");

    res.json({
      success: true,
      message: "RentSecure database tables verified",
      tables: rows.map((row) => Object.values(row)[0]),
    });
  } catch (error) {
    console.error("Schema test failed:", error.message);

    res.status(500).json({
      success: false,
      message: "Could not verify database tables",
    });
  }
});


app.get("/api/users/me", authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: "Authentication successful.",
    user: req.user,
  });
});



async function startServer() {
  try {
    const [rows] = await db.query("SELECT DATABASE() AS databaseName");
    console.log(`Connected to MySQL database "${rows[0].databaseName}"`);

    app.listen(PORT, () => {
      console.log(`RentSecure backend running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Database connection failed:", error.message);
    process.exitCode = 1;
  }
}

startServer();