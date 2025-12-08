import { useEffect, useState } from 'react';
import { notificationApi } from '../../services/apiClient';
import type { Notification } from '../../types';
import { Loader } from '../../components/common/Loader';
import { PageHeader } from '../../components/common/PageHeader';

export const OwnerNotificationsPage = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await notificationApi.list();
      setNotifications(data);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Gagal memuat notifikasi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleMarkRead = async (id: number) => {
    await notificationApi.markRead(String(id));
    fetchData();
  };

  return (
    <div>
      <PageHeader title="Notifikasi" />
      {loading && <Loader label="Memuat notifikasi..." />}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="space-y-3">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`rounded border p-4 ${notification.isRead ? 'bg-slate-50' : 'bg-white'}`}
          >
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-semibold">{notification.title}</h4>
                <p className="text-sm text-slate-600">{notification.message}</p>
                <p className="text-xs text-slate-400 mt-1">
                  {new Date(notification.createdAt).toLocaleString()}
                </p>
              </div>
              {!notification.isRead && (
                <button
                  className="text-sm text-primary"
                  onClick={() => handleMarkRead(notification.id)}
                >
                  Tandai dibaca
                </button>
              )}
            </div>
          </div>
        ))}
        {!loading && notifications.length === 0 && (
          <p className="text-sm text-slate-500">Tidak ada notifikasi.</p>
        )}
      </div>
    </div>
  );
};
