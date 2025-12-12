"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markNotificationReadController = exports.listNotificationsController =
  void 0;
const notificationService_1 = require("../services/notificationService");
const errors_1 = require("../utils/errors");
const listNotificationsController = async (req, res, next) => {
  try {
    if (!req.user) throw new errors_1.AppError("Unauthorized", 401);
    const notifications = await (0, notificationService_1.listNotifications)(
      req.user.id
    );
    res.json(notifications);
  } catch (error) {
    next(error);
  }
};
exports.listNotificationsController = listNotificationsController;
const markNotificationReadController = async (req, res, next) => {
  try {
    if (!req.user) throw new errors_1.AppError("Unauthorized", 401);
    const notificationId = Number(req.params.id);
    const notification = await (0,
    notificationService_1.markNotificationAsRead)(notificationId, req.user.id);
    res.json(notification);
  } catch (error) {
    next(error);
  }
};
exports.markNotificationReadController = markNotificationReadController;
//# sourceMappingURL=notificationController.js.map
