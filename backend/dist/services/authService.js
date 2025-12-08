"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginUser = exports.registerUser = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = require("../config/prisma");
const errors_1 = require("../utils/errors");
const password_1 = require("../utils/password");
const jwt_1 = require("../utils/jwt");
const SELF_REGISTER_ROLES = [client_1.UserRole.OWNER, client_1.UserRole.CLINIC];
const registerUser = async (params) => {
    if (!SELF_REGISTER_ROLES.includes(params.role)) {
        throw new errors_1.AppError('Only OWNER or CLINIC can self-register', 400);
    }
    const email = params.email.toLowerCase();
    const existing = await prisma_1.prisma.user.findUnique({ where: { email } });
    if (existing) {
        throw new errors_1.AppError('Email already registered', 400);
    }
    const passwordHash = await (0, password_1.hashPassword)(params.password);
    const user = await prisma_1.prisma.user.create({
        data: {
            name: params.name,
            email,
            passwordHash,
            role: params.role,
        },
        select: { id: true, name: true, email: true, role: true },
    });
    return user;
};
exports.registerUser = registerUser;
const loginUser = async (params) => {
    const email = params.email.toLowerCase();
    const user = await prisma_1.prisma.user.findUnique({
        where: { email },
    });
    if (!user) {
        throw new errors_1.AppError('Invalid credentials', 401);
    }
    const isValid = await (0, password_1.comparePassword)(params.password, user.passwordHash);
    if (!isValid) {
        throw new errors_1.AppError('Invalid credentials', 401);
    }
    const token = (0, jwt_1.signJwt)({ userId: user.id, role: user.role });
    return {
        token,
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
        },
    };
};
exports.loginUser = loginUser;
//# sourceMappingURL=authService.js.map