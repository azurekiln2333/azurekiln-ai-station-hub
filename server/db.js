import "dotenv/config";
import mysql from "mysql2/promise";

export const dbName = process.env.MYSQL_DATABASE || "azurekiln_ai_hub";

export function baseConfig(includeDatabase = true) {
  return {
    host: process.env.MYSQL_HOST || "127.0.0.1",
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "",
    ...(includeDatabase ? { database: dbName } : {}),
    waitForConnections: true,
    connectionLimit: 10,
    namedPlaceholders: true
  };
}

export const pool = mysql.createPool(baseConfig(true));

export async function query(sql, params = {}) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}
