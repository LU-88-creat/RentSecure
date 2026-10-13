import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import db from "./config/db.js";
import userRoutes from "./routes/userRoutes.js";


dotenv.config();

const app = express();

app.use(cors({
  origin: "http://localhost:5173",
}));

app.use(express.json());


app.use("/api/users", userRoutes);


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


app.listen(PORT, () => {
  console.log(`RentSecure backend running on port ${PORT}`);
});