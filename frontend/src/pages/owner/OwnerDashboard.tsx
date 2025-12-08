import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { petApi } from '../../services/apiClient';
import type { Pet } from '../../types';
import { Loader } from '../../components/common/Loader';
import { PageHeader } from '../../components/common/PageHeader';
import { DataTable } from '../../components/common/DataTable';

export const OwnerDashboard = () => {
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

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
    <div>
      <PageHeader
        title="Dashboard Pemilik"
        description="Kelola identitas hewan peliharaan, riwayat vaksin, koreksi data, dan transfer kepemilikan."
      />
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => navigate('/owner/pets/new')}
          className="rounded bg-primary px-4 py-2 text-white text-sm font-semibold hover:bg-blue-700"
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
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold uppercase">
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
                    className="text-sm text-primary hover:underline"
                  >
                    Detail
                  </button>
                  <button
                    onClick={() => navigate(`/owner/pets/${pet.id}/medical-records`)}
                    className="text-sm text-primary hover:underline"
                  >
                    Riwayat Vaksin
                  </button>
                  <button
                    onClick={() => navigate(`/owner/pets/${pet.id}/corrections/new`)}
                    className="text-sm text-primary hover:underline"
                  >
                    Koreksi Data
                  </button>
                  <button
                    onClick={() => navigate(`/owner/pets/${pet.id}/transfer`)}
                    className="text-sm text-primary hover:underline"
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
