"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.traceController = void 0;
const petService_1 = require("../services/petService");
const errors_1 = require("../utils/errors");
const traceController = async (req, res, next) => {
  try {
    const { publicId } = req.params;
    if (!publicId) throw new errors_1.AppError("publicId required", 400);
    const trace = await (0, petService_1.getTraceByPublicId)(publicId);
    res.json(trace);
  } catch (error) {
    next(error);
  }
};
exports.traceController = traceController;
//# sourceMappingURL=traceController.js.map
