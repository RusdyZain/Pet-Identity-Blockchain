import { useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { Loader } from '../../components/common/Loader';
import { TextField } from '../../components/forms/TextField';
import { adminApi } from '../../services/apiClient';
import type { AdminPet } from '../../types';

// Halaman admin untuk daftar seluruh hewan terdaftar.
export const AdminPetsPage = () => {
  const [pets, setPets] = useState<AdminPet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const loadPets = async (query?: { search?: string }) => {
    setLoading(true);
    setError('');
    try {
      const data = await adminApi.listPets(query);
      setPets(data);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Gagal memuat data hewan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPets();
  }, []);

  const handleSearch = async () => {
    const searchValue = search.trim() || undefined;
    await loadPets({ search: searchValue });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Daftar Hewan Terdaftar"
        description="Pantau seluruh data hewan yang berhasil diregistrasi oleh pemilik."
      />

      <section className="rounded-3xl border border-white/60 bg-white/90 p-6 shadow-lg shadow-primary/5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-secondary">Data Hewan</h3>
            <p className="text-sm text-slate-500">Cari berdasarkan nama, public ID, atau pemilik.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="min-w-[240px]">
              <TextField
                label="Cari"
                value={search}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setSearch(event.target.value)}
                placeholder="Nama, public ID, atau owner"
              />
            </div>
            <button
              type="button"
              onClick={handleSearch}
              className="h-11 self-end rounded-full bg-secondary px-5 text-sm font-semibold text-white shadow-lg shadow-secondary/30"
            >
              Terapkan
            </button>
          </div>
        </div>

        {loading && <div className="mt-4"><Loader label="Memuat hewan..." /></div>}
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        {!loading && pets.length === 0 && (
          <p className="mt-4 text-sm text-slate-500">Belum ada hewan terdaftar.</p>
        )}
        {!loading && pets.length > 0 && (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-3 py-2">Public ID</th>
                  <th className="px-3 py-2">Nama</th>
                  <th className="px-3 py-2">Spesies</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Pemilik</th>
                </tr>
              </thead>
              <tbody>
                {pets.map((pet) => (
                  <tr key={pet.id} className="border-t border-slate-100">
                    <td className="px-3 py-3 font-mono text-xs text-slate-500">{pet.publicId}</td>
                    <td className="px-3 py-3 font-semibold text-secondary">{pet.name}</td>
                    <td className="px-3 py-3 text-slate-500">{pet.species}</td>
                    <td className="px-3 py-3 text-slate-500">{pet.status}</td>
                    <td className="px-3 py-3 text-slate-500">
                      <div className="font-semibold text-secondary">{pet.owner?.name ?? '-'}</div>
                      <div className="text-xs text-slate-400">{pet.owner?.email ?? ''}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
