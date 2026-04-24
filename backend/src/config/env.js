import dotenv from "dotenv";
dotenv.config();

export const env = {
  port: Number(process.env.PORT || 4000),
  pg: {
    host: process.env.PG_HOST || "localhost",
    port: Number(process.env.PG_PORT || 5432),
    database: process.env.PG_DATABASE || "wasco_water_billing",
    user: process.env.PG_USER || "postgres",
    password: process.env.PG_PASSWORD || "12345"
  },
  mysql: {
    host: process.env.MYSQL_HOST || "localhost",
    port: Number(process.env.MYSQL_PORT || 3306),
    database: process.env.MYSQL_DATABASE || "wasco_water_billing",
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "123456"
  }
};
