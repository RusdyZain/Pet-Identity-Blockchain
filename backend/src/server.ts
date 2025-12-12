import app from "./app";
import { ENV } from "./config/env";
import { connectPrisma } from "./config/prisma";

const start = async () => {
  await connectPrisma();
  app.listen(ENV.port, () => {
    console.log(`Server running on port ${ENV.port}`);
  });
};

start().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
