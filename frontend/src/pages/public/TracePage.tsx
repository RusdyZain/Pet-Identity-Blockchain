import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import QRCode from 'qrcode';
import QrScanner from 'qr-scanner';
import { traceApi } from '../../services/apiClient';
import type { TraceResult } from '../../types';
import { TextField } from '../../components/forms/TextField';
import { DataTable } from '../../components/common/DataTable';
import { buildTraceUrl, extractPublicId } from '../../utils/traceQr';

// Halaman publik untuk menelusuri identitas hewan lewat public ID.
export const TracePage = () => {
  const [publicId, setPublicId] = useState('');
  const [result, setResult] = useState<TraceResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [scannerError, setScannerError] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [qrImageUrl, setQrImageUrl] = useState('');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerRef = useRef<QrScanner | null>(null);

  const resolveScanPayload = (result: string | { data: string }) =>
    typeof result === 'string' ? result : result.data;

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.stop();
      scannerRef.current.destroy();
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const fetchTrace = async (targetPublicId: string) => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const data = await traceApi.getByPublicId(targetPublicId);
      setResult(data);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Data tidak ditemukan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => () => stopScanner(), []);

  useEffect(() => {
    const initialPublicId = new URLSearchParams(window.location.search).get('publicId');
    if (!initialPublicId) {
      return;
    }
    const parsed = extractPublicId(initialPublicId);
    if (!parsed) {
      return;
    }
    setPublicId(parsed);
    void fetchTrace(parsed);
  }, []);

  useEffect(() => {
    if (!result?.publicId) {
      setQrImageUrl('');
      return;
    }

    const traceUrl = buildTraceUrl(window.location.origin, result.publicId);
    void QRCode.toDataURL(traceUrl, {
      width: 220,
      margin: 2,
    })
      .then((url) => {
        setQrImageUrl(url);
      })
      .catch(() => {
        setQrImageUrl('');
      });
  }, [result?.publicId]);

  // Kirim request trace berdasarkan input public ID.
  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const parsedPublicId = extractPublicId(publicId);
    if (!parsedPublicId) {
      setError('Format Public ID tidak valid.');
      return;
    }
    setPublicId(parsedPublicId);
    await fetchTrace(parsedPublicId);
  };

  const startScanner = async () => {
    setScannerError('');
    stopScanner();
    try {
      if (!videoRef.current) {
        throw new Error('Video scanner tidak tersedia.');
      }

      const scanner = new QrScanner(
        videoRef.current,
        (result) => {
          const rawValue = resolveScanPayload(result as string | { data: string });
          const parsedPublicId = extractPublicId(rawValue);
          if (!parsedPublicId) {
            return;
          }

          setPublicId(parsedPublicId);
          stopScanner();
          void fetchTrace(parsedPublicId);
        },
        {
          preferredCamera: 'environment',
          returnDetailedScanResult: true,
          highlightScanRegion: true,
          highlightCodeOutline: true,
        },
      );

      scannerRef.current = scanner;
      await scanner.start();
      setIsScanning(true);
    } catch (scannerStartError: any) {
      stopScanner();
      setScannerError(
        scannerStartError?.message ??
          'Gagal mengaktifkan scanner QR. Coba izinkan akses kamera atau gunakan upload gambar/manual input.',
      );
    }
  };

  const scanFromImageFile = async (event: ChangeEvent<HTMLInputElement>) => {
    setScannerError('');
    const file = event.currentTarget.files?.[0];
    if (!file) {
      return;
    }
    try {
      const scanned = await QrScanner.scanImage(file, {
        returnDetailedScanResult: true,
      });
      const rawValue = resolveScanPayload(scanned as string | { data: string });
      const parsedPublicId = extractPublicId(rawValue);
      if (!parsedPublicId) {
        throw new Error('Isi QR bukan Public ID yang valid.');
      }
      setPublicId(parsedPublicId);
      await fetchTrace(parsedPublicId);
    } catch (scanError: any) {
      setScannerError(
        scanError?.message ?? 'Gagal membaca QR dari gambar. Gunakan QR yang jelas atau input manual Public ID.',
      );
    } finally {
      event.currentTarget.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white/80 p-6 shadow-inner">
        <h2 className="text-2xl font-semibold text-secondary">Trace Identitas Hewan</h2>
        <p className="text-sm text-slate-500">
          Masukkan Public ID, scan QR dari kamera, atau upload gambar QR untuk verifikasi publik.
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
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            className="rounded-full bg-primary px-5 py-2 text-white font-semibold shadow-lg shadow-primary/30"
            disabled={loading}
          >
            {loading ? 'Mencari...' : 'Cari'}
          </button>
          <button
            type="button"
            onClick={isScanning ? stopScanner : () => void startScanner()}
            className="rounded-full border border-primary px-4 py-2 text-sm font-semibold text-primary"
          >
            {isScanning ? 'Hentikan Scanner' : 'Scan QR Kamera'}
          </button>
          <label className="cursor-pointer rounded-full border border-secondary px-4 py-2 text-sm font-semibold text-secondary">
            Scan dari Gambar
            <input type="file" accept="image/*" className="hidden" onChange={scanFromImageFile} />
          </label>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          Cara pakai: 1) Klik <strong>Scan QR Kamera</strong> lalu arahkan kamera ke QR pet. 2) Atau klik{' '}
          <strong>Scan dari Gambar</strong> untuk membaca QR dari file screenshot/foto. 3) Jika gagal, gunakan
          input manual Public ID.
        </div>
        {isScanning && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <video ref={videoRef} autoPlay muted playsInline className="w-full rounded-xl" />
          </div>
        )}
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {scannerError && <p className="text-sm text-red-600">{scannerError}</p>}
      {result && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-[2fr,1fr]">
            <div className="rounded-3xl border border-white/60 bg-white/90 p-5 shadow-sm">
              <p className="text-sm text-slate-500">Informasi Hewan</p>
              <h3 className="text-lg font-semibold">{result.name}</h3>
              <p className="text-sm text-slate-600">
                {result.species} / {result.breed}
              </p>
              <p className="text-sm text-slate-500 mt-2">Pemilik: {result.ownerName}</p>
              <p className="text-xs text-slate-400 mt-2">Public ID: {result.publicId}</p>
            </div>
            <div className="rounded-3xl border border-white/60 bg-white/90 p-5 shadow-sm">
              <p className="text-sm font-semibold text-secondary">QR Trace</p>
              {qrImageUrl ? (
                <img src={qrImageUrl} alt={`QR ${result.publicId}`} className="mt-3 w-full rounded-xl border" />
              ) : (
                <p className="mt-3 text-sm text-slate-500">QR belum tersedia.</p>
              )}
            </div>
          </div>
          <div className="rounded-3xl border border-white/60 bg-white/90 p-5 shadow-sm">
            <h4 className="text-md font-semibold mb-2 text-secondary">Ringkasan Vaksinasi Terverifikasi</h4>
            <DataTable
              data={result.vaccines}
              emptyMessage="Belum ada vaksin terverifikasi."
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
          <div className="rounded-3xl border border-white/60 bg-white/90 p-5 shadow-sm">
            <h4 className="text-md font-semibold mb-2 text-secondary">Riwayat Kepemilikan (Privasi Tersamarkan)</h4>
            <DataTable
              data={result.ownershipHistory.items}
              emptyMessage="Belum ada riwayat transfer kepemilikan."
              columns={[
                {
                  key: 'fromOwner',
                  header: 'Pemilik Sebelumnya',
                  render: (item) => (
                    <div>
                      <p className="font-medium">{item.fromOwner.name}</p>
                      <p className="text-xs text-slate-500">{item.fromOwner.wallet ?? '-'}</p>
                    </div>
                  ),
                },
                {
                  key: 'toOwner',
                  header: 'Pemilik Baru',
                  render: (item) => (
                    <div>
                      <p className="font-medium">{item.toOwner.name}</p>
                      <p className="text-xs text-slate-500">{item.toOwner.wallet ?? '-'}</p>
                    </div>
                  ),
                },
                {
                  key: 'requestedAt',
                  header: 'Tanggal Permintaan',
                  render: (item) => new Date(item.requestedAt).toLocaleString(),
                },
                {
                  key: 'transferredAt',
                  header: 'Tanggal Transfer',
                  render: (item) =>
                    item.transferredAt
                      ? new Date(item.transferredAt).toLocaleString()
                      : 'Belum',
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
