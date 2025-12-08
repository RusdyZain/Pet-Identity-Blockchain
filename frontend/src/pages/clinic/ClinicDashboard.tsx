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
    <div>
      <PageHeader
        title="Dashboard Klinik"
        description="Akses cepat terhadap identitas hewan, catatan vaksinasi, dan koreksi data."
      />
      <form className="mb-4 flex flex-col md:flex-row gap-3" onSubmit={handleSearch}>
        <input
          type="text"
          value={search}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.currentTarget.value)}
          placeholder="Cari berdasarkan nama atau public ID"
          className="flex-1 rounded border border-slate-300 px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded bg-primary px-4 py-2 text-white font-semibold">
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
                  className="text-sm text-primary hover:underline"
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
