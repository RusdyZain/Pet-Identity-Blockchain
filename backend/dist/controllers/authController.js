"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = exports.register = void 0;
const authService_1 = require("../services/authService");
const errors_1 = require("../utils/errors");
const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role) {
      throw new errors_1.AppError("Missing required fields", 400);
    }
    const user = await (0, authService_1.registerUser)({
      name,
      email,
      password,
      role: role,
    });
    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
};
exports.register = register;
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      throw new errors_1.AppError("Missing credentials", 400);
    }
    const result = await (0, authService_1.loginUser)({ email, password });
    res.json(result);
  } catch (error) {
    next(error);
  }
};
exports.login = login;
//# sourceMappingURL=authController.js.map
