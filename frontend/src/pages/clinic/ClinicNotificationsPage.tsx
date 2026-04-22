import { PageHeader } from '../../components/common/PageHeader';
import { NotificationsList } from '../../components/notifications/NotificationsList';
import { useNotifications } from '../../hooks/useNotifications';

// Halaman notifikasi khusus role klinik.
export const ClinicNotificationsPage = () => {
  const { notifications, loading, error, markAsRead } = useNotifications({
    limit: 20,
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Notifikasi Klinik"
        description="Pantau review koreksi, proses verifikasi, dan pembaruan medis yang perlu ditindaklanjuti."
      />
      <NotificationsList
        notifications={notifications}
        loading={loading}
        error={error}
        loadingLabel="Memuat notifikasi klinik..."
        emptyMessage="Tidak ada notifikasi untuk klinik."
        onMarkRead={markAsRead}
      />
    </div>
  );
};
