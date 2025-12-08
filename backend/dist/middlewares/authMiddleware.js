"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = exports.authenticate = void 0;
const jwt_1 = require("../utils/jwt");
const errors_1 = require("../utils/errors");
const authenticate = (options = {}) => (req, _res, next) => {
    const header = req.headers.authorization;
    if (!header) {
        if (options.optional)
            return next();
        return next(new errors_1.AppError('Unauthorized', 401));
    }
    const token = header.startsWith('Bearer ') ? header.slice(7) : header;
    try {
        const payload = (0, jwt_1.verifyJwt)(token);
        req.user = { id: payload.userId, role: payload.role };
        return next();
    }
    catch (_err) {
        if (options.optional)
            return next();
        return next(new errors_1.AppError('Invalid token', 401));
    }
};
exports.authenticate = authenticate;
const authorize = (roles) => {
    return (req, _res, next) => {
        if (!req.user) {
            return next(new errors_1.AppError('Unauthorized', 401));
        }
        if (!roles.includes(req.user.role)) {
            return next(new errors_1.AppError('Forbidden', 403));
        }
        return next();
    };
};
exports.authorize = authorize;
//# sourceMappingURL=authMiddleware.js.map