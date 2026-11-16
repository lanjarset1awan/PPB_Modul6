import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { pool } from "./config/database.js";
import readingsRoutes from "./routes/readingsRoutes.js";
import thresholdsRoutes from "./routes/thresholdsRoutes.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/readings", readingsRoutes);
app.use("/api/thresholds", thresholdsRoutes);

async function initDb() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.sensor_readings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        temperature NUMERIC(6,2) NOT NULL,
        distance NUMERIC(6,2),
        threshold_value NUMERIC(6,2),
        recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      ALTER TABLE public.sensor_readings 
        ADD COLUMN IF NOT EXISTS distance NUMERIC(6,2);
    `);
    console.log("Database schema verified (distance column ready).");
  } catch (err) {
    console.warn("Database initialization note:", err.message);
  }
}

const port = process.env.PORT || 5002;
app.listen(port, '0.0.0.0', async () => {
  console.log(`Backend server running on port ${port}`);
  await initDb();
});
