import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { petApi, medicalRecordApi } from '../../services/apiClient';
import type { MedicalRecord, Pet } from '../../types';
import { Loader } from '../../components/common/Loader';
import { PageHeader } from '../../components/common/PageHeader';

export const OwnerPetDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [pet, setPet] = useState<Pet | null>(null);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      setLoading(true);
      setError('');
      try {
        const [petResponse, medicalResponse] = await Promise.all([
          petApi.detail(id),
          medicalRecordApi.list(id),
        ]);
        setPet(petResponse);
        setRecords(medicalResponse.slice(0, 3));
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
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-white/50 bg-white/90 p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-secondary mb-3">Identitas</h3>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-slate-500">Public ID</dt>
              <dd className="font-semibold">{pet.publicId}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Jenis / Ras</dt>
              <dd className="font-semibold">
                {pet.species} / {pet.breed}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Tanggal Lahir</dt>
              <dd className="font-semibold">
                {new Date(pet.birthDate).toLocaleDateString()} {pet.age ? `(${pet.age} th)` : ''}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Warna & Ciri Fisik</dt>
              <dd className="font-semibold">
                {pet.color} • {pet.physicalMark}
              </dd>
            </div>
          </dl>
        </div>
        <div className="rounded-3xl border border-white/50 bg-white/90 p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-secondary mb-3">Riwayat Vaksin Terbaru</h3>
          {records.length === 0 ? (
            <p className="text-sm text-slate-500">Belum ada catatan vaksin.</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {records.map((record) => (
                <li key={record.id} className="border rounded p-3">
                  <p className="font-semibold">{record.vaccineType}</p>
                  <p className="text-slate-500">
                    {new Date(record.givenAt).toLocaleDateString()} • Status{' '}
                    <span className="uppercase">{record.status}</span>
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

