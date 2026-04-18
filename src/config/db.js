const { Pool } = require("pg");

function stripSslModeFromConnectionString(connectionString) {
  try {
    const parsed = new URL(connectionString);
    parsed.searchParams.delete("sslmode");
    return parsed.toString();
  } catch (err) {
    console.warn("[db] DATABASE_URL could not be parsed as URL. Using it as-is.");
    return connectionString;
  }
}

function getPoolConfig() {
  if (process.env.DATABASE_URL) {
    const connectionString = stripSslModeFromConnectionString(process.env.DATABASE_URL);

    return {
      connectionString,
      ssl: { rejectUnauthorized: false },
    };
  }

  const host = process.env.PGHOST || "127.0.0.1";
  const port = Number(process.env.PGPORT || 5432);
  const user = process.env.PGUSER || "postgres";
  const database = process.env.PGDATABASE || "postgres";

  console.warn(
    `[db] DATABASE_URL is not set. Falling back to PGHOST/PGPORT/PGUSER/PGDATABASE (${user}@${host}:${port}/${database}).`
  );

  return {
    host,
    port,
    user,
    password: process.env.PGPASSWORD,
    database,
    ssl: false,
  };
}

const pool = new Pool(getPoolConfig());

pool.on("error", (err) => {
  console.error("[db] Unexpected PostgreSQL client error:", err.message);
});

async function query(text, params = []) {
  return pool.query(text, params);
}

module.exports = {
  pool,
  query,
};
