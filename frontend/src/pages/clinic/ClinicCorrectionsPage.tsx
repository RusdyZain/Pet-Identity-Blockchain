import { useEffect, useState } from 'react';
import { correctionApi } from '../../services/apiClient';
import type { CorrectionRequest } from '../../types';
import { Loader } from '../../components/common/Loader';
import { PageHeader } from '../../components/common/PageHeader';

// Halaman review koreksi data yang diajukan pemilik.
export const ClinicCorrectionsPage = () => {
  const [items, setItems] = useState<CorrectionRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Ambil koreksi data yang statusnya masih pending.
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

  // Setujui atau tolak permintaan koreksi.
  const handleReview = async (id: number, status: 'APPROVED' | 'REJECTED') => {
    await correctionApi.review(String(id), { status });
    fetchData();
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Koreksi Data Pending" />
      {loading && <Loader label="Memuat koreksi..." />}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="rounded-3xl border border-white/50 bg-white/90 p-5 shadow-sm">
            <p className="font-semibold text-secondary">
              {item.fieldName}: {item.oldValue} &rarr; {item.newValue}
            </p>
            {item.reason && <p className="mt-1 text-sm text-slate-500">Alasan: {item.reason}</p>}
            <div className="mt-3 flex gap-3">
              <button
                className="rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary"
                onClick={() => handleReview(item.id, 'APPROVED')}
              >
                Setujui
              </button>
              <button
                className="rounded-full bg-red-50 px-4 py-2 text-sm font-semibold text-red-500"
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
