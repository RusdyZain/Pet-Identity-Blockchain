import type { Notification } from '../../types';
import { Loader } from '../common/Loader';

type NotificationsListProps = {
  notifications: Notification[];
  loading: boolean;
  error: string;
  loadingLabel: string;
  emptyMessage: string;
  onMarkRead: (id: number) => void | Promise<void>;
};

export const NotificationsList = ({
  notifications,
  loading,
  error,
  loadingLabel,
  emptyMessage,
  onMarkRead,
}: NotificationsListProps) => (
  <>
    {loading && <Loader label={loadingLabel} />}
    {error && <p className="text-sm text-red-600">{error}</p>}
    <div className="space-y-3">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`rounded-2xl border border-white/50 p-4 shadow-sm ${
            notification.isRead ? 'bg-mist/60' : 'bg-white/90'
          }`}
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
              <button className="text-sm font-semibold text-primary" onClick={() => onMarkRead(notification.id)}>
                Tandai dibaca
              </button>
            )}
          </div>
        </div>
      ))}
      {!loading && notifications.length === 0 && (
        <p className="text-sm text-slate-500">{emptyMessage}</p>
      )}
    </div>
  </>
);
