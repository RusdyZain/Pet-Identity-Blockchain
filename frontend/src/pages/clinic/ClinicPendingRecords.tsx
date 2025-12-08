import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { medicalRecordApi } from '../../services/apiClient';
import type { MedicalRecord } from '../../types';
import { Loader } from '../../components/common/Loader';
import { PageHeader } from '../../components/common/PageHeader';

export const ClinicPendingRecords = () => {
  const [petId, setPetId] = useState('');
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchData = async (id: string) => {
    setLoading(true);
    setError('');
    try {
      const data = await medicalRecordApi.list(id);
      setRecords(data.filter((record) => record.status === 'PENDING'));
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Gagal memuat data');
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (event: FormEvent) => {
    event.preventDefault();
    if (petId.trim()) {
      fetchData(petId.trim());
    }
  };

  const handleUpdate = async (id: number, status: 'VERIFIED' | 'REJECTED') => {
    await medicalRecordApi.verify(String(id), status);
    if (petId) fetchData(petId);
  };

  return (
    <div>
      <PageHeader
        title="Catatan Vaksin Pending"
        description="Masukkan ID hewan untuk melihat catatan pending yang siap diverifikasi."
      />
      <form className="mb-4 flex gap-3" onSubmit={handleSearch}>
        <input
          value={petId}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setPetId(e.currentTarget.value)}
          placeholder="Masukkan ID hewan"
          className="flex-1 rounded border border-slate-300 px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded bg-primary px-4 py-2 text-white font-semibold">
          Tampilkan
        </button>
      </form>
      {loading && <Loader label="Mengambil data..." />}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="space-y-3">
        {records.map((record) => (
          <div key={record.id} className="bg-white p-4 rounded shadow flex justify-between">
            <div>
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
        {!loading && records.length === 0 && petId && (
          <p className="text-sm text-slate-500">Tidak ada catatan pending untuk hewan ini.</p>
        )}
      </div>
    </div>
  );
};





