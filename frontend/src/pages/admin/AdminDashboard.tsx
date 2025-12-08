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
      } catch (err: any) {
        setError('Gagal memuat statistik dari server. Menampilkan angka dummy.');
        setSummary(fallbackSummary);
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, []);

  return (
    <div>
      <PageHeader
        title="Dashboard Admin"
        description="Tinjau statistik global registrasi hewan dan aktivitas vaksinasi."
      />
      {loading && <Loader label="Memuat data..." />}
      {error && <p className="text-sm text-amber-600">{error}</p>}
      <div className="grid md:grid-cols-3 gap-4 mt-4">
        <div className="bg-white p-4 rounded shadow">
          <p className="text-sm text-slate-500">Hewan Terdaftar</p>
          <p className="text-3xl font-bold">{summary.totalPets}</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <p className="text-sm text-slate-500">Catatan Vaksin</p>
          <p className="text-3xl font-bold">{summary.totalMedicalRecords}</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <p className="text-sm text-slate-500">Transfer Kepemilikan</p>
          <p className="text-3xl font-bold">{summary.totalTransfers}</p>
        </div>
      </div>
    </div>
  );
};
