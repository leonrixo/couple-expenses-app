import { readFileSync } from "node:fs";
import { Client } from "pg";
import { config } from "dotenv";

const file = process.argv[2];
if (!file) {
  console.error("Uso: node scripts/run-migration.mjs <ruta-al-archivo.sql>");
  process.exit(1);
}

// Load from .env.local first, then fall back to .env
config({ path: ".env.local" });
config(); // Fall back to .env if .env.local doesn't have the var

const sql = readFileSync(file, "utf-8");
const client = new Client({ connectionString: process.env.DATABASE_URL });

await client.connect();
try {
  await client.query(sql);
  console.log(`OK: ${file} aplicado.`);
} finally {
  await client.end();
}
