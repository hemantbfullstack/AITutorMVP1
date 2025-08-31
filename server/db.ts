import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// OPTIMIZED: Neon serverless connection pool
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 3, // Neon serverless works best with 2-3 connections
  min: 1, // Keep at least 1 connection alive
  idleTimeoutMillis: 60000, // Keep connections alive longer
  connectionTimeoutMillis: 10000, // More generous timeout
  maxUses: 1000, // Reuse connections more times
});

// Connection event logging
pool.on('connect', (client) => {
  console.log('🟢 New DB connection created');
});

pool.on('acquire', (client) => {
  console.log('🔵 Connection acquired from pool');
});

pool.on('release', (client) => {
  console.log('🟡 Connection released back to pool');
});

pool.on('error', (err, client) => {
  console.error('🔴 Database connection error:', err);
});

export const db = drizzle(pool, { 
  schema,
  logger: false // Disable query logging in production
});

// Monitor pool health
export const getPoolStatus = () => {
  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount
  };
};

// Health check function
export const checkPoolHealth = async () => {
  try {
    const client = await pool.connect();
    client.release();
    return { healthy: true, ...getPoolStatus() };
  } catch (error) {
    return { healthy: false, error: error.message, ...getPoolStatus() };
  }
};