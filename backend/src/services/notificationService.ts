import { AppDataSource } from "../config/dataSource";
import { Notification } from "../entities/Notification";
import { NotificationEventType } from "../types/enums";
import { AppError } from "../utils/errors";

export type CreateNotificationParams = {
  userId: number;
  title: string;
  message: string;
  eventType?: NotificationEventType;
  petId?: number | null;
  sourceId?: string | number | null;
  actionUrl?: string | null;
};

export type ListNotificationParams = {
  userId: number;
  page?: number;
  limit?: number;
  isRead?: boolean;
  eventType?: NotificationEventType;
  startDate?: Date;
  endDate?: Date;
};

export type NotificationListResult = {
  items: Notification[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const toSourceId = (sourceId?: string | number | null) =>
  sourceId === undefined || sourceId === null ? null : String(sourceId);

// Buat notifikasi baru untuk user.
export const createNotification = async (
  params: CreateNotificationParams
) => {
  const repo = AppDataSource.getRepository(Notification);
  try {
    return await repo.save(
      repo.create({
        userId: params.userId,
        title: params.title,
        message: params.message,
        eventType: params.eventType ?? NotificationEventType.GENERAL,
        petId: params.petId ?? null,
        sourceId: toSourceId(params.sourceId),
        actionUrl: params.actionUrl ?? null,
      })
    );
  } catch (error) {
    // Fail-soft: bisnis utama tidak boleh gagal saat insert notifikasi bermasalah.
    console.error("[notification] create failed", {
      userId: params.userId,
      title: params.title,
      eventType: params.eventType ?? NotificationEventType.GENERAL,
      petId: params.petId ?? null,
      sourceId: toSourceId(params.sourceId),
      error,
    });
    return null;
  }
};

export const createNotificationsForUsers = async (
  params: Omit<CreateNotificationParams, "userId"> & { userIds: number[] }
) => {
  const uniqueUserIds = Array.from(
    new Set(
      params.userIds.filter(
        (userId) => Number.isInteger(userId) && userId > 0
      )
    )
  );

  await Promise.all(
    uniqueUserIds.map((userId) =>
      createNotification({
        userId,
        title: params.title,
        message: params.message,
        ...(params.eventType ? { eventType: params.eventType } : {}),
        ...(params.petId !== undefined ? { petId: params.petId } : {}),
        ...(params.sourceId !== undefined ? { sourceId: params.sourceId } : {}),
        ...(params.actionUrl !== undefined ? { actionUrl: params.actionUrl } : {}),
      })
    )
  );
};

// Ambil daftar notifikasi user, terbaru di atas.
export const listNotifications = async (
  params: ListNotificationParams
): Promise<NotificationListResult> => {
  const page = clamp(Math.floor(params.page ?? 1), 1, Number.MAX_SAFE_INTEGER);
  const limit = clamp(Math.floor(params.limit ?? 20), 1, 100);
  const qb = AppDataSource.getRepository(Notification)
    .createQueryBuilder("notification")
    .where("notification.userId = :userId", { userId: params.userId })
    .orderBy("notification.createdAt", "DESC");

  if (typeof params.isRead === "boolean") {
    qb.andWhere("notification.isRead = :isRead", { isRead: params.isRead });
  }
  if (params.eventType) {
    qb.andWhere("notification.eventType = :eventType", {
      eventType: params.eventType,
    });
  }
  if (params.startDate) {
    qb.andWhere("notification.createdAt >= :startDate", {
      startDate: params.startDate,
    });
  }
  if (params.endDate) {
    qb.andWhere("notification.createdAt <= :endDate", {
      endDate: params.endDate,
    });
  }

  const [items, total] = await qb
    .skip((page - 1) * limit)
    .take(limit)
    .getManyAndCount();

  return {
    items,
    meta: {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
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

  const readAt = notification.readAt ?? new Date();
  await repo.update({ id: notificationId }, { isRead: true, readAt });
  const updated = await repo.findOne({ where: { id: notificationId } });
  if (!updated) {
    throw new AppError("Notification not found", 404);
  }
  return updated;
};
