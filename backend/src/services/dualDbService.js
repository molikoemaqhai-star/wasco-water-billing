import { pgPool, mysqlPool } from "../config/db.js";

function placeholders(count) {
  return Array.from({ length: count }, (_, index) => `$${index + 1}`).join(", ");
}

export async function dualInsert(table, payload) {
  const keys = Object.keys(payload);
  const values = Object.values(payload);
  const pgSql = `INSERT INTO ${table} (${keys.join(", ")}) VALUES (${placeholders(keys.length)})`;

  const mysqlSql = `INSERT INTO ${table} (${keys.join(", ")}) VALUES (${keys.map(() => "?").join(", ")})`;

  const pgClient = await pgPool.connect();
  const mysqlConn = await mysqlPool.getConnection();

  try {
    await pgClient.query("BEGIN");
    await mysqlConn.beginTransaction();

    await pgClient.query(pgSql, values);
    await mysqlConn.execute(mysqlSql, values);

    await pgClient.query("COMMIT");
    await mysqlConn.commit();
  } catch (error) {
    await pgClient.query("ROLLBACK");
    await mysqlConn.rollback();
    throw error;
  } finally {
    pgClient.release();
    mysqlConn.release();
  }
}

export async function dualUpdate(table, payload, idColumn, idValue) {
  const keys = Object.keys(payload);
  const values = Object.values(payload);
  const assignmentsPg = keys.map((key, index) => `${key} = $${index + 1}`).join(", ");
  const assignmentsMysql = keys.map((key) => `${key} = ?`).join(", ");
  const pgSql = `UPDATE ${table} SET ${assignmentsPg} WHERE ${idColumn} = $${keys.length + 1}`;
  const mysqlSql = `UPDATE ${table} SET ${assignmentsMysql} WHERE ${idColumn} = ?`;

  const pgClient = await pgPool.connect();
  const mysqlConn = await mysqlPool.getConnection();

  try {
    await pgClient.query("BEGIN");
    await mysqlConn.beginTransaction();

    await pgClient.query(pgSql, [...values, idValue]);
    await mysqlConn.execute(mysqlSql, [...values, idValue]);

    await pgClient.query("COMMIT");
    await mysqlConn.commit();
  } catch (error) {
    await pgClient.query("ROLLBACK");
    await mysqlConn.rollback();
    throw error;
  } finally {
    pgClient.release();
    mysqlConn.release();
  }
}

export async function dualDelete(table, idColumn, idValue) {
  const pgSql = `DELETE FROM ${table} WHERE ${idColumn} = $1`;
  const mysqlSql = `DELETE FROM ${table} WHERE ${idColumn} = ?`;

  const pgClient = await pgPool.connect();
  const mysqlConn = await mysqlPool.getConnection();

  try {
    await pgClient.query("BEGIN");
    await mysqlConn.beginTransaction();

    await pgClient.query(pgSql, [idValue]);
    await mysqlConn.execute(mysqlSql, [idValue]);

    await pgClient.query("COMMIT");
    await mysqlConn.commit();
  } catch (error) {
    await pgClient.query("ROLLBACK");
    await mysqlConn.rollback();
    throw error;
  } finally {
    pgClient.release();
    mysqlConn.release();
  }
}
