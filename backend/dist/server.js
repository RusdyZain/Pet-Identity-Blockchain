"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const env_1 = require("./config/env");
const prisma_1 = require("./config/prisma");
const start = async () => {
    await (0, prisma_1.connectPrisma)();
    app_1.default.listen(env_1.ENV.port, () => {
        console.log(`Server running on port ${env_1.ENV.port}`);
    });
};
start().catch((error) => {
    console.error('Failed to start server', error);
    process.exit(1);
});
//# sourceMappingURL=server.js.map