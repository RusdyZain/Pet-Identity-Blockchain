import { AppDataSource } from "../config/dataSource";
import { Notification } from "../entities/Notification";
import { AppError } from "../utils/errors";

// Buat notifikasi baru untuk user.
export const createNotification = async (params: {
  userId: number;
  title: string;
  message: string;
}) => {
  const repo = AppDataSource.getRepository(Notification);
  return repo.save(
    repo.create({
      userId: params.userId,
      title: params.title,
      message: params.message,
    })
  );
};

// Ambil daftar notifikasi user, terbaru di atas.
export const listNotifications = async (userId: number) => {
  return AppDataSource.getRepository(Notification).find({
    where: { userId },
    order: { createdAt: "DESC" },
  });
};

// Tandai notifikasi sebagai sudah dibaca.
export const markNotificationAsRead = async (
  notificationId: number,
  userId: number
) => {
  const repo = AppDataSource.getRepository(Notification);
  const notification = await repo.findOne({ where: { id: notificationId } });

  if (!notification || notification.userId !== userId) {
    throw new AppError("Notification not found", 404);
  }

  await repo.update({ id: notificationId }, { isRead: true });
  const updated = await repo.findOne({ where: { id: notificationId } });
  if (!updated) {
    throw new AppError("Notification not found", 404);
  }
  return updated;
};
