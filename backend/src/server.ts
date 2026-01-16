import app from "./app";
import { ENV } from "./config/env";
import { connectPrisma } from "./config/prisma";

// Mulai server setelah koneksi database siap.
const start = async () => {
  await connectPrisma();
  app.listen(ENV.port, () => {
    console.log(`Server running on port ${ENV.port}`);
  });
};

// Tangani error startup agar proses berhenti dengan jelas.
start().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
