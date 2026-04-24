import app from "./app.js";
import { env } from "./config/env.js";
import { testConnections } from "./config/db.js";

async function start() {
  try {
    await testConnections();
    app.listen(env.port, () => {
      console.log(`Server running on http://localhost:${env.port}`);
    });
  } catch (error) {
    console.error("Failed to start server:");
    console.error(error);
    process.exit(1);
  }
}

start();
