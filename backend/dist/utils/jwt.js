"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyJwt = exports.signJwt = void 0;
const jsonwebtoken_1 = require("jsonwebtoken");
const env_1 = require("../config/env");
const secret = (env_1.ENV.jwtSecret || 'changeme');
const signJwt = (payload, expiresIn = '12h') => {
    const options = { expiresIn };
    return (0, jsonwebtoken_1.sign)(payload, secret, options);
};
exports.signJwt = signJwt;
const verifyJwt = (token) => {
    return (0, jsonwebtoken_1.verify)(token, secret);
};
exports.verifyJwt = verifyJwt;
//# sourceMappingURL=jwt.js.map