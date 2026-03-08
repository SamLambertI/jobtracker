import pg from "pg";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sql = readFileSync(
  join(__dirname, "..", "supabase", "migrations", "00001_initial_schema.sql"),
  "utf-8"
);

const regions = [
  "aws-0-eu-west-1",
  "aws-0-eu-west-2",
  "aws-0-eu-west-3",
  "aws-0-eu-central-1",
  "aws-0-us-east-1",
  "aws-0-us-west-1",
  "aws-0-ap-southeast-1",
  "aws-0-ap-northeast-1",
];

for (const region of regions) {
  const host = `${region}.pooler.supabase.com`;
  console.log(`Trying ${host}...`);
  const client = new pg.Client({
    host,
    port: 5432,
    database: "postgres",
    user: "postgres.fgwxkecmlowepnorknhp",
    password: "FGW6GPXqS3MqwHbt",
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });
  try {
    await client.connect();
    console.log(`Connected via ${host}!`);
    await client.query(sql);
    console.log("Migration completed successfully!");
    await client.end();
    process.exit(0);
  } catch (err) {
    console.log(`  Failed: ${err.message}`);
    try { await client.end(); } catch {}
  }
}
console.error("All regions failed.");
process.exit(1);
