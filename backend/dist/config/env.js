"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.ENV = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.ENV = {
  port: Number(process.env.PORT) || 4000,
  jwtSecret: process.env.JWT_SECRET || "changeme",
  databaseUrl: process.env.DATABASE_URL || "",
};
if (!exports.ENV.databaseUrl) {
  // eslint-disable-next-line no-console
  console.warn("DATABASE_URL is not set. Prisma may fail to connect.");
}
//# sourceMappingURL=env.js.map
