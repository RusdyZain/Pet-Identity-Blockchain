import { useEffect, useState } from 'react';
import { correctionApi } from '../../services/apiClient';
import type { CorrectionRequest } from '../../types';
import { Loader } from '../../components/common/Loader';
import { PageHeader } from '../../components/common/PageHeader';

export const ClinicCorrectionsPage = () => {
  const [items, setItems] = useState<CorrectionRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await correctionApi.list('PENDING');
      setItems(data);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Gagal memuat koreksi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleReview = async (id: number, status: 'APPROVED' | 'REJECTED') => {
    await correctionApi.review(String(id), { status });
    fetchData();
  };

  return (
    <div>
      <PageHeader title="Koreksi Data Pending" />
      {loading && <Loader label="Memuat koreksi..." />}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="bg-white p-4 rounded shadow">
            <p className="font-semibold">
              {item.fieldName}: {item.oldValue} &rarr; {item.newValue}
            </p>
            {item.reason && <p className="text-sm text-slate-500 mt-1">Alasan: {item.reason}</p>}
            <div className="mt-3 flex gap-3">
              <button
                className="text-sm text-green-600"
                onClick={() => handleReview(item.id, 'APPROVED')}
              >
                Setujui
              </button>
              <button
                className="text-sm text-red-600"
                onClick={() => handleReview(item.id, 'REJECTED')}
              >
                Tolak
              </button>
            </div>
          </div>
        ))}
        {!loading && items.length === 0 && (
          <p className="text-sm text-slate-500">Tidak ada koreksi pending.</p>
        )}
      </div>
    </div>
  );
};
