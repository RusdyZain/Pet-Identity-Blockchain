import { useCallback, useEffect, useState } from 'react';
import { notificationApi } from '../services/apiClient';
import type { Notification, NotificationListMeta } from '../types';

type UseNotificationsOptions = {
  limit?: number;
  eventType?: Notification['eventType'];
  autoLoad?: boolean;
};

const DEFAULT_LIMIT = 20;

export const useNotifications = (options: UseNotificationsOptions = {}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [meta, setMeta] = useState<NotificationListMeta>({
    page: 1,
    limit: options.limit ?? DEFAULT_LIMIT,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await notificationApi.list({
        page: 1,
        limit: options.limit ?? DEFAULT_LIMIT,
        eventType: options.eventType,
      });
      setNotifications(response.items);
      setMeta(response.meta);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Gagal memuat notifikasi');
    } finally {
      setLoading(false);
    }
  }, [options.eventType, options.limit]);

  useEffect(() => {
    if (options.autoLoad === false) {
      return;
    }
    void fetchNotifications();
  }, [fetchNotifications, options.autoLoad]);

  const markAsRead = useCallback(
    async (id: number) => {
      await notificationApi.markRead(String(id));
      await fetchNotifications();
    },
    [fetchNotifications]
  );

  return {
    notifications,
    meta,
    loading,
    error,
    refresh: fetchNotifications,
    markAsRead,
  };
};
