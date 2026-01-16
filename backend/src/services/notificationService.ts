import { prisma } from "../config/prisma";
import { AppError } from "../utils/errors";

// Buat notifikasi baru untuk user.
export const createNotification = async (params: {
  userId: number;
  title: string;
  message: string;
}) => {
  return prisma.notification.create({
    data: {
      userId: params.userId,
      title: params.title,
      message: params.message,
    },
  });
};

// Ambil daftar notifikasi user, terbaru di atas.
export const listNotifications = async (userId: number) => {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
};

// Tandai notifikasi sebagai sudah dibaca.
export const markNotificationAsRead = async (
  notificationId: number,
  userId: number
) => {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification || notification.userId !== userId) {
    throw new AppError("Notification not found", 404);
  }

  return prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });
};
