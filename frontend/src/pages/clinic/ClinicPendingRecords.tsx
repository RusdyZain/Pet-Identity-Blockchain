import { useEffect, useState } from 'react';
import { medicalRecordApi } from '../../services/apiClient';
import type { MedicalRecord } from '../../types';
import { Loader } from '../../components/common/Loader';
import { PageHeader } from '../../components/common/PageHeader';

export const ClinicPendingRecords = () => {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchPending = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await medicalRecordApi.pending();
      setRecords(data);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Gagal memuat data');
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleUpdate = async (id: number, status: 'VERIFIED' | 'REJECTED') => {
    await medicalRecordApi.verify(String(id), status);
    fetchPending();
  };

  return (
    <div>
      <PageHeader
        title="Catatan Vaksin Pending"
        description="Daftar catatan pending dari klinik Anda yang siap diverifikasi."
      />
      <div className="flex justify-end mb-4">
        <button
          type="button"
          onClick={fetchPending}
          className="rounded border px-4 py-2 text-sm text-primary border-primary hover:bg-primary hover:text-white transition"
        >
          Refresh
        </button>
      </div>
      {loading && <Loader label="Mengambil data..." />}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="space-y-3">
        {records.map((record) => (
          <div key={record.id} className="bg-white p-4 rounded shadow flex justify-between">
            <div>
              <p className="text-sm text-slate-500">
                {record.pet?.name ?? 'Hewan'} ({record.pet?.publicId ?? `#${record.pet?.id ?? '-'}`})
              </p>
              <p className="font-semibold">{record.vaccineType}</p>
              <p className="text-sm text-slate-600">
                Batch {record.batchNumber} / {new Date(record.givenAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                className="text-sm text-green-600"
                onClick={() => handleUpdate(record.id, 'VERIFIED')}
              >
                Verifikasi
              </button>
              <button
                className="text-sm text-red-600"
                onClick={() => handleUpdate(record.id, 'REJECTED')}
              >
                Tolak
              </button>
            </div>
          </div>
        ))}
        {!loading && records.length === 0 && (
          <p className="text-sm text-slate-500">Tidak ada catatan pending saat ini.</p>
        )}
      </div>
    </div>
  );
};
