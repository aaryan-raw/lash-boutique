import { Pool } from "pg";
import { SCHEMA } from "../lib/schema";
(async () => {
  if (!process.env.DATABASE_URL) { console.error("DATABASE_URL is not set"); process.exit(1); }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  await pool.query(SCHEMA); await pool.end(); console.log("Schema applied.");
})();
