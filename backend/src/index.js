import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "./config/database.js";
import readingsRoutes from "./routes/readingsRoutes.js";
import thresholdsRoutes from "./routes/thresholdsRoutes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/readings", readingsRoutes);
app.use("/api/thresholds", thresholdsRoutes);

// Health check endpoint
app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", database: "connected", timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ status: "error", database: err.message });
  }
});

async function initDb() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.sensor_readings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        temperature NUMERIC(6,2) NOT NULL,
        threshold_value NUMERIC(6,2),
        recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await pool.query(`
      ALTER TABLE public.sensor_readings 
        ADD COLUMN IF NOT EXISTS distance NUMERIC(6,2);
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.threshold_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        value NUMERIC(6,2) NOT NULL,
        note TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log("Database schema verified (sensor_readings with distance column ready).");
  } catch (err) {
    console.warn("Database initialization note:", err.message);
  }
}

const port = process.env.PORT || 5002;
app.listen(port, '0.0.0.0', async () => {
  console.log(`Backend server running on port ${port}`);
  await initDb();
});
