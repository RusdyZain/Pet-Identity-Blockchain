import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { medicalRecordApi } from '../../services/apiClient';
import type { MedicalRecord } from '../../types';
import { Loader } from '../../components/common/Loader';
import { PageHeader } from '../../components/common/PageHeader';

export const OwnerMedicalRecordsPage = () => {
  const { id } = useParams<{ id: string }>();
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchRecords = async () => {
      if (!id) return;
      setLoading(true);
      setError('');
      try {
        const data = await medicalRecordApi.list(id);
        setRecords(data);
      } catch (err: any) {
        setError(err?.response?.data?.message ?? 'Gagal memuat catatan medis');
      } finally {
        setLoading(false);
      }
    };
    fetchRecords();
  }, [id]);

  return (
    <div>
      <PageHeader title="Riwayat Vaksin / Kesehatan" />
      {loading && <Loader label="Memuat catatan medis..." />}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="space-y-3">
        {records.map((record) => (
          <div key={record.id} className="bg-white rounded shadow p-4">
            <p className="font-semibold">{record.vaccineType}</p>
            <p className="text-sm text-slate-600">
              Nomor Batch: {record.batchNumber} | {new Date(record.givenAt).toLocaleDateString()}
            </p>
            <p className="text-xs uppercase mt-2">Status: {record.status}</p>
            {record.evidenceUrl && (
              <a className="text-primary text-sm" href={record.evidenceUrl} target="_blank" rel="noreferrer">
                Bukti
              </a>
            )}
          </div>
        ))}
        {!loading && records.length === 0 && (
          <p className="text-sm text-slate-500">Belum ada riwayat vaksin untuk hewan ini.</p>
        )}
      </div>
    </div>
  );
};
