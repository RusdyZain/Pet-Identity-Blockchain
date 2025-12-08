"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markNotificationAsRead = exports.listNotifications = exports.createNotification = void 0;
const prisma_1 = require("../config/prisma");
const errors_1 = require("../utils/errors");
const createNotification = async (params) => {
    return prisma_1.prisma.notification.create({
        data: {
            userId: params.userId,
            title: params.title,
            message: params.message,
        },
    });
};
exports.createNotification = createNotification;
const listNotifications = async (userId) => {
    return prisma_1.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
    });
};
exports.listNotifications = listNotifications;
const markNotificationAsRead = async (notificationId, userId) => {
    const notification = await prisma_1.prisma.notification.findUnique({
        where: { id: notificationId },
    });
    if (!notification || notification.userId !== userId) {
        throw new errors_1.AppError('Notification not found', 404);
    }
    return prisma_1.prisma.notification.update({
        where: { id: notificationId },
        data: { isRead: true },
    });
};
exports.markNotificationAsRead = markNotificationAsRead;
//# sourceMappingURL=notificationService.js.map