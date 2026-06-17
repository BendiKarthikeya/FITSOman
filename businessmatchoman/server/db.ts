import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
const { Pool } = pkg;
import { migrate } from "drizzle-orm/node-postgres/migrator";
import * as schema from "@shared/schema";

// Log database configuration status
if (!process.env.DATABASE_URL) {
  console.log("No DATABASE_URL provided, will use in-memory storage");
}

const statementTimeoutMs = parseInt(process.env.DB_STATEMENT_TIMEOUT || "5000", 10);

const shouldUseSsl = (() => {
  const url = process.env.DATABASE_URL;
  if (!url) {
    return false;
  }

  if (process.env.DB_SSL === "false") {
    return false;
  }

  try {
    const parsed = new URL(url);
    if (["localhost", "127.0.0.1"].includes(parsed.hostname)) {
      return false;
    }
  } catch {
    // If the URL cannot be parsed, default to enabling SSL (safer default)
  }

  return true;
})();

// Enhanced PostgreSQL connection pool configuration with improved resilience
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: shouldUseSsl ? { rejectUnauthorized: false } : false,

  // Connection limits - more conservative for stability
  max: parseInt(process.env.DB_POOL_MAX || "3"), // Reduced further for better resource management
  min: parseInt(process.env.DB_POOL_MIN || "0"), // No minimum idle connections

  // Timeouts - more aggressive for faster failure detection
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || "5000"), // 5 seconds - shorter idle timeout
  connectionTimeoutMillis: parseInt(
    process.env.DB_CONNECTION_TIMEOUT || "5000",
  ), // 5 seconds

  // Health checks
  allowExitOnIdle: true, // Allow pool to exit when idle to prevent stale connections
  maxUses: parseInt(process.env.DB_MAX_USES || "100"), // Much lower max uses for frequent connection refresh

});

// Pool event handlers for monitoring
pool.on("connect", (client) => {
  console.log(
    `[DB] New client connected. Total: ${pool.totalCount}, Idle: ${pool.idleCount}`,
  );

  if (!Number.isNaN(statementTimeoutMs)) {
    const timeoutValue = statementTimeoutMs <= 0 ? "0" : `${statementTimeoutMs}`;
    void client
      .query(`SET statement_timeout TO ${timeoutValue};`)
      .catch((err) => {
        console.error("[DB] Failed to set statement_timeout", err);
      });
  }
});

pool.on("acquire", (client) => {
  console.log(
    `[DB] Client acquired. Active: ${pool.totalCount - pool.idleCount}, Waiting: ${pool.waitingCount}`,
  );
});

pool.on("error", (err, client) => {
  console.error("[DB] Unexpected error on idle client", err);
  // Don't crash the application on database errors
  // The pool will automatically handle reconnection
});

pool.on("remove", (client) => {
  console.log(
    `[DB] Client removed. Total: ${pool.totalCount}, Idle: ${pool.idleCount}`,
  );
});

// Create Drizzle client with all schema tables
export const db = drizzle(pool, { schema });

// Function to run migrations
export async function runMigrations() {
  try {
    console.log("Running database migrations...");
    await migrate(db, { migrationsFolder: "drizzle" });
    console.log("Migrations completed successfully");
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  }
}

// Function to check database connection with timeout and retry logic
export async function checkDbConnection(): Promise<boolean> {
  let retries = 3;

  while (retries > 0) {
    try {
      // Use Promise.race to implement timeout
      const connectionPromise = (async () => {
        const client = await pool.connect();
        try {
          // Test the connection with a simple query
          await client.query("SELECT NOW()");
          return true;
        } finally {
          client.release();
        }
      })();

      const timeoutPromise = new Promise<boolean>((_, reject) => {
        setTimeout(() => reject(new Error("Connection timeout")), 3000);
      });

      await Promise.race([connectionPromise, timeoutPromise]);
      console.log("Database connection successful");
      return true;
    } catch (error) {
      retries--;
      console.error(
        `Database connection attempt failed (${3 - retries}/3):`,
        error instanceof Error ? error.message : String(error),
      );

      if (retries > 0) {
        console.log(`Retrying in 1 second...`);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  console.error("Database connection failed after all retries");
  return false;
}

// Function to get pool statistics
export function getPoolStats() {
  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
    activeCount: pool.totalCount - pool.idleCount,
  };
}

// Function to gracefully close the pool
export async function closePool(): Promise<void> {
  try {
    console.log("[DB] Closing connection pool...");
    await pool.end();
    console.log("[DB] Connection pool closed successfully");
  } catch (error) {
    console.error("[DB] Error closing connection pool:", error);
    throw error;
  }
}

// Health check function for monitoring
export async function healthCheck(): Promise<{
  healthy: boolean;
  stats: any;
  latency?: number;
}> {
  const startTime = Date.now();

  try {
    const client = await pool.connect();
    const result = await client.query("SELECT 1 as test");
    client.release();

    const latency = Date.now() - startTime;
    const stats = getPoolStats();

    return {
      healthy: true,
      stats,
      latency,
    };
  } catch (error) {
    console.error("[DB] Health check failed:", error);
    return {
      healthy: false,
      stats: getPoolStats(),
    };
  }
}
