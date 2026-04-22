import { Request, Response, NextFunction } from "express";
import {
  listNotifications,
  markNotificationAsRead,
} from "../services/notificationService";
import { AppError } from "../utils/errors";
import { NotificationEventType } from "../types/enums";

const parseBooleanQuery = (value: unknown, fieldName: string) => {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") {
      return true;
    }
    if (normalized === "false") {
      return false;
    }
  }
  throw new AppError(`${fieldName} harus bernilai true/false`, 400);
};

const parseDateQuery = (value: unknown, fieldName: string) => {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "string" || !value.trim()) {
    throw new AppError(`${fieldName} tidak valid`, 400);
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new AppError(`${fieldName} tidak valid`, 400);
  }
  return parsed;
};

// Handler list notifikasi user.
export const listNotificationsController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);
    const pageRaw = req.query.page;
    const limitRaw = req.query.limit;
    const page =
      pageRaw === undefined ? 1 : Number.parseInt(String(pageRaw), 10);
    const limit =
      limitRaw === undefined ? 20 : Number.parseInt(String(limitRaw), 10);

    if (!Number.isInteger(page) || page <= 0) {
      throw new AppError("page harus bilangan bulat positif", 400);
    }
    if (!Number.isInteger(limit) || limit <= 0) {
      throw new AppError("limit harus bilangan bulat positif", 400);
    }

    const eventTypeRaw = req.query.eventType;
    let eventType: NotificationEventType | undefined;
    if (eventTypeRaw !== undefined) {
      if (
        typeof eventTypeRaw !== "string" ||
        !(eventTypeRaw in NotificationEventType)
      ) {
        throw new AppError("eventType tidak valid", 400);
      }
      eventType = eventTypeRaw as NotificationEventType;
    }

    const startDate = parseDateQuery(req.query.startDate, "startDate");
    const endDate = parseDateQuery(req.query.endDate, "endDate");
    if (startDate && endDate && startDate.getTime() > endDate.getTime()) {
      throw new AppError("startDate harus lebih kecil dari endDate", 400);
    }

    const isRead = parseBooleanQuery(req.query.isRead, "isRead");
    const notifications = await listNotifications({
      userId: req.user.id,
      page,
      limit,
      ...(isRead !== undefined ? { isRead } : {}),
      ...(eventType ? { eventType } : {}),
      ...(startDate ? { startDate } : {}),
      ...(endDate ? { endDate } : {}),
    });
    res.json(notifications);
  } catch (error) {
    next(error);
  }
};

// Handler menandai notifikasi sebagai dibaca.
export const markNotificationReadController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);
    const notificationId = Number(req.params.id);
    const notification = await markNotificationAsRead(
      notificationId,
      req.user.id
    );
    res.json(notification);
  } catch (error) {
    next(error);
  }
};
