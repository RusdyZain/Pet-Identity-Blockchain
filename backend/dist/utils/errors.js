"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertRole = exports.AppError = void 0;
class AppError extends Error {
    constructor(message, statusCode = 400) {
        super(message);
        this.statusCode = statusCode;
    }
}
exports.AppError = AppError;
const assertRole = (role, allowed) => {
    if (!allowed.includes(role)) {
        throw new AppError('Forbidden', 403);
    }
};
exports.assertRole = assertRole;
//# sourceMappingURL=errors.js.map