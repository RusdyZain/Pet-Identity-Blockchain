import { useEffect, useState } from 'react';
import { medicalRecordApi } from '../../services/apiClient';
import type { MedicalRecord } from '../../types';
import { Loader } from '../../components/common/Loader';
import { PageHeader } from '../../components/common/PageHeader';

// Halaman untuk memverifikasi catatan vaksin yang masih pending.
export const ClinicPendingRecords = () => {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Ambil daftar catatan yang menunggu verifikasi.
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

  // Update status verifikasi catatan.
  const handleUpdate = async (id: number, status: 'VERIFIED' | 'REJECTED') => {
    await medicalRecordApi.verify(String(id), status);
    fetchPending();
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Catatan Vaksin Pending"
        description="Daftar catatan pending dari klinik Anda yang siap diverifikasi."
      />
      <div className="flex justify-end">
        <button
          type="button"
          onClick={fetchPending}
          className="rounded-full border border-primary/40 px-5 py-2 text-sm font-semibold text-primary transition hover:bg-primary hover:text-white"
        >
          Refresh
        </button>
      </div>
      {loading && <Loader label="Mengambil data..." />}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="space-y-3">
        {records.map((record) => (
          <div
            key={record.id}
            className="flex flex-col justify-between gap-3 rounded-3xl border border-white/60 bg-white/90 p-4 shadow-sm md:flex-row md:items-center"
          >
            <div>
              <p className="text-sm text-slate-500">
                {record.pet?.name ?? 'Hewan'} ({record.pet?.publicId ?? `#${record.pet?.id ?? '-'}`})
              </p>
              <p className="text-lg font-semibold text-secondary">{record.vaccineType}</p>
              <p className="text-sm text-slate-600">
                Batch {record.batchNumber} / {new Date(record.givenAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                className="rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary"
                onClick={() => handleUpdate(record.id, 'VERIFIED')}
              >
                Verifikasi
              </button>
              <button
                className="rounded-full bg-red-50 px-4 py-2 text-sm font-semibold text-red-500"
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
