import pg from "pg";
import mysql from "mysql2/promise";
import { env } from "./env.js";

const { Pool } = pg;

export const pgPool = new Pool({
  host: env.pg.host,
  port: env.pg.port,
  database: env.pg.database,
  user: env.pg.user,
  password: env.pg.password,
});

export const mysqlPool = mysql.createPool({
  host: env.mysql.host,
  port: env.mysql.port,
  database: env.mysql.database,
  user: env.mysql.user,
  password: env.mysql.password,
  waitForConnections: true,
  connectionLimit: 10,
});

export async function testConnections() {
  try {
    const pgClient = await pgPool.connect();
    try {
      await pgClient.query("SELECT 1");
      console.log("PostgreSQL connection OK");
    } finally {
      pgClient.release();
    }
  } catch (error) {
    console.error("PostgreSQL connection failed:", error.message);
    throw error;
  }

  try {
    const mysqlConn = await mysqlPool.getConnection();
    try {
      await mysqlConn.query("SELECT 1");
      console.log("MySQL connection OK");
    } finally {
      mysqlConn.release();
    }
  } catch (error) {
    console.warn("MySQL connection failed (non-fatal):", error.message);
  }
}