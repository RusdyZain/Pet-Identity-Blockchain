import { Request, Response, NextFunction } from 'express';
import { listNotifications, markNotificationAsRead } from '../services/notificationService';
import { AppError } from '../utils/errors';

export const listNotificationsController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const notifications = await listNotifications(req.user.id);
    res.json(notifications);
  } catch (error) {
    next(error);
  }
};

export const markNotificationReadController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const notificationId = Number(req.params.id);
    const notification = await markNotificationAsRead(notificationId, req.user.id);
    res.json(notification);
  } catch (error) {
    next(error);
  }
};
