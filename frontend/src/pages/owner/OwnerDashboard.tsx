import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { petApi } from '../../services/apiClient';
import type { Pet } from '../../types';
import { Loader } from '../../components/common/Loader';
import { PageHeader } from '../../components/common/PageHeader';
import { DataTable } from '../../components/common/DataTable';

// Dashboard pemilik: list hewan dan pintasan aksi.
export const OwnerDashboard = () => {
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Ambil daftar hewan milik user saat halaman dibuka.
  useEffect(() => {
    const fetchPets = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await petApi.list();
        setPets(data);
      } catch (err: any) {
        setError(err?.response?.data?.message ?? 'Gagal memuat data hewan');
      } finally {
        setLoading(false);
      }
    };
    fetchPets();
  }, []);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Dashboard Pemilik"
        description="Kelola identitas hewan peliharaan, riwayat vaksin, koreksi data, dan transfer kepemilikan."
      />
      <div className="flex items-center justify-between rounded-2xl bg-white/70 px-4 py-3 shadow-sm">
        <p className="text-sm text-slate-500">
          {pets.length ? `${pets.length} hewan tercatat dalam akun Anda.` : 'Belum ada hewan terdaftar.'}
        </p>
        <button
          onClick={() => navigate('/owner/pets/new')}
          className="rounded-full bg-secondary px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-secondary/30 transition hover:bg-primary"
        >
          + Registrasi Hewan
        </button>
      </div>
      {loading && <Loader label="Mengambil data hewan..." />}
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      {!loading && (
        <DataTable
          data={pets}
          emptyMessage="Belum ada hewan terdaftar."
          columns={[
            { key: 'name', header: 'Nama' },
            { key: 'species', header: 'Jenis' },
            { key: 'breed', header: 'Ras' },
            { key: 'publicId', header: 'Public ID' },
            {
              key: 'status',
              header: 'Status',
              render: (pet) => (
                <span className="rounded-full bg-mist px-3 py-1 text-xs font-semibold uppercase text-primary">
                  {pet.status}
                </span>
              ),
            },
            {
              key: 'actions',
              header: 'Aksi',
              render: (pet) => (
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => navigate(`/owner/pets/${pet.id}`)}
                    className="text-sm font-semibold text-primary hover:underline"
                  >
                    Detail
                  </button>
                  <button
                    onClick={() => navigate(`/owner/pets/${pet.id}/medical-records`)}
                    className="text-sm font-semibold text-primary hover:underline"
                  >
                    Riwayat Vaksin
                  </button>
                  <button
                    onClick={() => navigate(`/owner/pets/${pet.id}/corrections/new`)}
                    className="text-sm font-semibold text-primary hover:underline"
                  >
                    Koreksi Data
                  </button>
                  <button
                    onClick={() => navigate(`/owner/pets/${pet.id}/transfer`)}
                    className="text-sm font-semibold text-primary hover:underline"
                  >
                    Transfer
                  </button>
                </div>
              ),
            },
          ]}
        />
      )}
    </div>
  );
};
