import { PageHeader } from '../../components/common/PageHeader';
import { NotificationsList } from '../../components/notifications/NotificationsList';
import { useNotifications } from '../../hooks/useNotifications';

// Halaman daftar notifikasi untuk pemilik.
export const OwnerNotificationsPage = () => {
  const { notifications, loading, error, markAsRead } = useNotifications({
    limit: 20,
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Notifikasi Pemilik"
        description="Lihat update transfer kepemilikan, koreksi data, dan status verifikasi medis hewan Anda."
      />
      <NotificationsList
        notifications={notifications}
        loading={loading}
        error={error}
        loadingLabel="Memuat notifikasi..."
        emptyMessage="Tidak ada notifikasi."
        onMarkRead={markAsRead}
      />
    </div>
  );
};
