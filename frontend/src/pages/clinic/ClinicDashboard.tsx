import { useEffect, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { petApi } from '../../services/apiClient';
import type { Pet } from '../../types';
import { PageHeader } from '../../components/common/PageHeader';
import { Loader } from '../../components/common/Loader';
import { DataTable } from '../../components/common/DataTable';

export const ClinicDashboard = () => {
  const [pets, setPets] = useState<Pet[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const fetchPets = async (term?: string) => {
    setLoading(true);
    setError('');
    try {
      const data = await petApi.list(term ? { search: term } : undefined);
      setPets(data);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Gagal memuat data hewan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPets();
  }, []);

  const handleSearch = (event: FormEvent) => {
    event.preventDefault();
    fetchPets(search.trim() || undefined);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Dashboard Klinik"
        description="Akses cepat terhadap identitas hewan, catatan vaksinasi, dan koreksi data."
      />
      <form
        className="mb-4 flex flex-col gap-3 rounded-2xl border border-white/60 bg-white/90 p-4 shadow-sm md:flex-row"
        onSubmit={handleSearch}
      >
        <input
          type="text"
          value={search}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.currentTarget.value)}
          placeholder="Cari berdasarkan nama atau public ID"
          className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <button
          type="submit"
          className="rounded-full bg-secondary px-5 py-2 text-sm font-semibold text-white shadow-secondary/30 transition hover:bg-primary"
        >
          Cari
        </button>
      </form>
      {loading && <Loader label="Memuat data..." />}
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      {!loading && (
        <DataTable
          data={pets}
          columns={[
            { key: 'publicId', header: 'Public ID' },
            { key: 'name', header: 'Nama Hewan' },
            { key: 'species', header: 'Jenis' },
            { key: 'breed', header: 'Ras' },
            {
              key: 'actions',
              header: 'Aksi',
              render: (pet) => (
                <button
                  onClick={() => navigate(`/clinic/pets/${pet.id}`)}
                  className="text-sm font-semibold text-primary hover:underline"
                >
                  Detail
                </button>
              ),
            },
          ]}
        />
      )}
    </div>
  );
};
