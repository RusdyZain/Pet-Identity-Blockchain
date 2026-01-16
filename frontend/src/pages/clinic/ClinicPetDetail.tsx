import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { petApi, medicalRecordApi } from '../../services/apiClient';
import type { MedicalRecord, Pet } from '../../types';
import { Loader } from '../../components/common/Loader';
import { PageHeader } from '../../components/common/PageHeader';

// Detail hewan untuk klinik dengan akses tambah catatan vaksin.
export const ClinicPetDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [pet, setPet] = useState<Pet | null>(null);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Ambil detail hewan dan seluruh catatan vaksin.
  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      setLoading(true);
      setError('');
      try {
        const [petData, recordData] = await Promise.all([petApi.detail(id), medicalRecordApi.list(id)]);
        setPet(petData);
        setRecords(recordData);
      } catch (err: any) {
        setError(err?.response?.data?.message ?? 'Gagal memuat detail hewan');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) return <Loader label="Memuat detail hewan..." />;
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!pet) return null;

  return (
    <div className="space-y-4">
      <PageHeader title={`Detail Hewan - ${pet.name}`} />
      <div className="flex justify-end">
        <button
          className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow-primary/30"
          onClick={() => navigate(`/clinic/pets/${pet.id}/medical-records/new`)}
        >
          + Tambah Catatan Vaksin
        </button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-white/50 bg-white/90 p-5 shadow-sm">
          <h3 className="font-semibold text-secondary mb-2">Identitas</h3>
          <p className="text-sm text-slate-600">
            {pet.species} • {pet.breed}
          </p>
          <p className="text-sm text-slate-600">Public ID: {pet.publicId}</p>
        </div>
        <div className="rounded-3xl border border-white/50 bg-white/90 p-5 shadow-sm">
          <h3 className="font-semibold text-secondary mb-2">Riwayat Vaksin</h3>
          <ul className="space-y-2 text-sm">
            {records.slice(0, 5).map((record) => (
              <li key={record.id} className="border-b border-dashed border-slate-200 pb-2">
                <p className="font-semibold">{record.vaccineType}</p>
                <p className="text-slate-500">
                  {new Date(record.givenAt).toLocaleDateString()} ({record.status})
                </p>
              </li>
            ))}
            {records.length === 0 && <p className="text-slate-500">Belum ada catatan.</p>}
          </ul>
        </div>
      </div>
    </div>
  );
};
