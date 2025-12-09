import { useEffect, useState } from 'react';
import { statsApi } from '../../services/apiClient';
import { PageHeader } from '../../components/common/PageHeader';
import { Loader } from '../../components/common/Loader';

type Summary = {
  totalPets: number;
  totalMedicalRecords: number;
  totalTransfers: number;
};

const fallbackSummary: Summary = {
  totalPets: 0,
  totalMedicalRecords: 0,
  totalTransfers: 0,
};

export const AdminDashboard = () => {
  const [summary, setSummary] = useState<Summary>(fallbackSummary);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSummary = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await statsApi.adminSummary();
        setSummary({
          totalPets: data.totalPets ?? 0,
          totalMedicalRecords: data.totalMedicalRecords ?? 0,
          totalTransfers: data.totalTransfers ?? 0,
        });
      } catch (_err) {
        setError('Gagal memuat statistik dari server. Menampilkan angka cadangan.');
        setSummary(fallbackSummary);
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, []);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Dashboard Admin"
        description="Tinjau statistik global registrasi hewan dan aktivitas vaksinasi."
      />
      {loading && <Loader label="Memuat data..." />}
      {error && <p className="text-sm text-amber-600 mt-2">{error}</p>}
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: 'Hewan Terdaftar', value: summary.totalPets },
          { label: 'Catatan Vaksin', value: summary.totalMedicalRecords },
          { label: 'Transfer Kepemilikan', value: summary.totalTransfers },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-3xl border border-white/60 bg-white/90 p-6 text-center shadow-lg shadow-primary/5"
          >
            <p className="text-sm uppercase tracking-widest text-slate-400">{item.label}</p>
            <p className="mt-2 text-4xl font-bold text-secondary">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
