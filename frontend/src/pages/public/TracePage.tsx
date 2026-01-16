import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { traceApi } from '../../services/apiClient';
import type { TraceResult } from '../../types';
import { TextField } from '../../components/forms/TextField';
import { DataTable } from '../../components/common/DataTable';

// Halaman publik untuk menelusuri identitas hewan lewat public ID.
export const TracePage = () => {
  const [publicId, setPublicId] = useState('');
  const [result, setResult] = useState<TraceResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Kirim request trace berdasarkan input public ID.
  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!publicId.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const data = await traceApi.getByPublicId(publicId.trim());
      setResult(data);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Data tidak ditemukan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white/80 p-6 shadow-inner">
        <h2 className="text-2xl font-semibold text-secondary">Trace Identitas Hewan</h2>
        <p className="text-sm text-slate-500">
          Masukkan kode publik / QR ID untuk memverifikasi identitas hewan secara publik.
        </p>
      </div>
      <form
        className="space-y-4 rounded-3xl border border-white/60 bg-white/90 p-6 shadow-lg shadow-primary/5"
        onSubmit={handleSubmit}
      >
        <TextField
          label="Public ID"
          value={publicId}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setPublicId(e.currentTarget.value)}
          placeholder="Contoh: PET-ABC123"
          required
        />
        <button
          type="submit"
          className="rounded-full bg-primary px-5 py-2 text-white font-semibold shadow-lg shadow-primary/30"
          disabled={loading}
        >
          {loading ? 'Mencari...' : 'Cari'}
        </button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {result && (
        <div className="space-y-4">
          <div className="rounded-3xl border border-white/60 bg-white/90 p-5 shadow-sm">
            <p className="text-sm text-slate-500">Informasi Hewan</p>
            <h3 className="text-lg font-semibold">{result.name}</h3>
            <p className="text-sm text-slate-600">
              {result.species} / {result.breed}
            </p>
            <p className="text-sm text-slate-500 mt-2">Pemilik: {result.ownerName}</p>
          </div>
          <div className="rounded-3xl border border-white/60 bg-white/90 p-5 shadow-sm">
            <h4 className="text-md font-semibold mb-2 text-secondary">Ringkasan Vaksinasi Terverifikasi</h4>
            <DataTable
              data={result.vaccines}
              columns={[
                { key: 'vaccineType', header: 'Jenis Vaksin' },
                {
                  key: 'lastGivenAt',
                  header: 'Tanggal',
                  render: (item) => new Date(item.lastGivenAt).toLocaleDateString(),
                },
                { key: 'status', header: 'Status' },
              ]}
            />
          </div>
        </div>
      )}
    </div>
  );
};
