import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';

// Ambil base URL dari env dan pastikan tidak ada trailing slash.
const rawBaseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';
const API_BASE_URL = rawBaseUrl.endsWith('/') ? rawBaseUrl.slice(0, -1) : rawBaseUrl;

// Helper untuk memastikan path selalu benar.
const buildUrl = (path: string) => `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;

// Format objek ke JSON agar mudah dibaca di UI.
const formatJson = (value: unknown) => {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

// Format jam agar log aktivitas mudah dibaca.
const formatTimestamp = (value: string) =>
  new Date(value).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

// Ambil pesan error paling relevan dari respons fetch.
const extractErrorMessage = async (response: Response) => {
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    const data = await response.json().catch(() => null);
    if (data && typeof data === 'object' && 'message' in data && typeof data.message === 'string') {
      return data.message;
    }
    if (typeof data === 'string') {
      return data;
    }
    if (data) {
      return formatJson(data);
    }
  }
  const text = await response.text();
  if (text) return text;
  return `Request failed with status ${response.status}`;
};

type TextInputProps = {
  id: string;
  label: string;
  value: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

// Input sederhana yang dipakai berulang di form simulator.
const TextInput = ({ id, label, type = 'text', value, placeholder, required, onChange }: TextInputProps) => (
  <label htmlFor={id} className="flex flex-col gap-1 text-sm text-slate-700">
    <span className="font-medium">{label}</span>
    <input
      id={id}
      name={id}
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
    />
  </label>
);

// Struktur data untuk mencatat aktivitas simulasi.
type LogEntry = {
  id: string;
  action: string;
  detail: string;
  status: 'info' | 'success' | 'error';
  timestamp: string;
};

// Halaman simulasi untuk mengetes endpoint debug blockchain.
export const BlockchainSimulatorPage = () => {
  // Status jaringan backend.
  const [networkStatus, setNetworkStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [networkMessage, setNetworkMessage] = useState('');
  const [networkLoading, setNetworkLoading] = useState(false);

  // Form registrasi hewan baru.
  const [registerForm, setRegisterForm] = useState({
    publicId: '',
    name: '',
    species: '',
    breed: '',
    birthDate: '',
  });
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerError, setRegisterError] = useState('');
  const [registerTxHash, setRegisterTxHash] = useState('');

  // Form dan data untuk fetch satu hewan.
  const [fetchPetId, setFetchPetId] = useState('');
  const [petLoading, setPetLoading] = useState(false);
  const [petError, setPetError] = useState('');
  const [petNotice, setPetNotice] = useState('');
  const [petData, setPetData] = useState<unknown | null>(null);

  // Form untuk menambah catatan vaksin.
  const [recordForm, setRecordForm] = useState({
    petId: '',
    vaccineType: '',
    batchNumber: '',
    givenAt: '',
  });
  const [recordLoading, setRecordLoading] = useState(false);
  const [recordError, setRecordError] = useState('');
  const [recordTxHash, setRecordTxHash] = useState('');

  // Form untuk melihat semua catatan vaksin.
  const [recordsPetId, setRecordsPetId] = useState('');
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [recordsError, setRecordsError] = useState('');
  const [recordsNotice, setRecordsNotice] = useState('');
  const [recordsData, setRecordsData] = useState<unknown | null>(null);
  // Log aktivitas untuk pelacakan langkah simulasi.
  const [activityLog, setActivityLog] = useState<LogEntry[]>([]);

  // Tambahkan entry log terbaru ke bagian atas.
  const pushLog = (entry: Omit<LogEntry, 'id' | 'timestamp'>) => {
    setActivityLog((prev) => [
      {
        ...entry,
        id: `${Date.now()}-${Math.random()}`,
        timestamp: new Date().toISOString(),
      },
      ...prev,
    ].slice(0, 12));
  };

  // Ping endpoint /health untuk cek koneksi backend.
  const handlePing = async () => {
    setNetworkLoading(true);
    setNetworkStatus('idle');
    setNetworkMessage('');
    pushLog({ action: 'Ping Backend', status: 'info', detail: 'Menghubungi endpoint /health' });
    try {
      const response = await fetch(buildUrl('/health'));
      if (!response.ok) {
        throw new Error(await extractErrorMessage(response));
      }
      const payload = await response.json().catch(() => null);
      setNetworkStatus('success');
      if (payload && typeof payload === 'object' && 'status' in payload) {
        setNetworkMessage(String((payload as Record<string, unknown>).status));
      } else {
        setNetworkMessage('Backend is reachable.');
      }
      pushLog({ action: 'Ping Backend', status: 'success', detail: 'Backend responsif' });
    } catch (error) {
      setNetworkStatus('error');
      setNetworkMessage(error instanceof Error ? error.message : 'Ping failed.');
      pushLog({
        action: 'Ping Backend',
        status: 'error',
        detail: error instanceof Error ? error.message : 'Ping gagal',
      });
    } finally {
      setNetworkLoading(false);
    }
  };

  // Update field form registrasi dengan helper generator.
  const handleRegisterChange =
    (field: keyof typeof registerForm) => (event: ChangeEvent<HTMLInputElement>) => {
      const { value } = event.currentTarget;
      setRegisterForm((prev) => ({ ...prev, [field]: value }));
    };

  // Submit registrasi hewan ke endpoint debug.
  const handleRegisterSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const birthDateValue = new Date(registerForm.birthDate);
    if (Number.isNaN(birthDateValue.getTime())) {
      setRegisterError('Tanggal lahir tidak valid.');
      pushLog({
        action: 'Register Pet',
        status: 'error',
        detail: 'Tanggal lahir tidak valid.',
      });
      return;
    }
    const birthDateTimestamp = Math.floor(birthDateValue.getTime() / 1000);
    setRegisterLoading(true);
    setRegisterError('');
    setRegisterTxHash('');
    pushLog({ action: 'Register Pet', status: 'info', detail: 'Mengirim transaksi register' });
    try {
      const response = await fetch(buildUrl('/debug/register-pet'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          publicId: registerForm.publicId.trim(),
          name: registerForm.name.trim(),
          species: registerForm.species.trim(),
          breed: registerForm.breed.trim(),
          birthDate: birthDateTimestamp,
        }),
      });
      if (!response.ok) {
        throw new Error(await extractErrorMessage(response));
      }
      const data = await response.json().catch(() => ({}));
      setRegisterTxHash((data as Record<string, unknown>).txHash?.toString() ?? 'Transaction submitted.');
      pushLog({
        action: 'Register Pet',
        status: 'success',
        detail: (data as Record<string, unknown>).txHash ? `txHash: ${(data as Record<string, unknown>).txHash}` : 'Pet berhasil direkam',
      });
    } catch (error) {
      setRegisterError(error instanceof Error ? error.message : 'Failed to register pet.');
      pushLog({
        action: 'Register Pet',
        status: 'error',
        detail: error instanceof Error ? error.message : 'Gagal menambahkan pet',
      });
    } finally {
      setRegisterLoading(false);
    }
  };

  // Ambil data satu hewan berdasarkan ID.
  const handleFetchPet = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!fetchPetId.trim()) return;
    setPetLoading(true);
    setPetError('');
    setPetNotice('');
    setPetData(null);
    pushLog({ action: 'Fetch Pet', status: 'info', detail: `Mengambil data pet #${fetchPetId.trim()}` });
    try {
      const response = await fetch(buildUrl(`/debug/pet/${fetchPetId.trim()}`));
      if (!response.ok) {
        throw new Error(await extractErrorMessage(response));
      }
      const data = await response.json();
      setPetData(data);
      setPetNotice('');
      pushLog({ action: 'Fetch Pet', status: 'success', detail: `Data pet #${fetchPetId.trim()} diterima` });
    } catch (error) {
      if (error instanceof Error && /id tidak ditemukan/i.test(error.message)) {
        setPetNotice(error.message);
        setPetError('');
        pushLog({
          action: 'Fetch Pet',
          status: 'info',
          detail: error.message,
        });
      } else {
        setPetError(error instanceof Error ? error.message : 'Failed to fetch pet.');
        pushLog({
          action: 'Fetch Pet',
          status: 'error',
          detail: error instanceof Error ? error.message : 'Gagal mengambil data pet',
        });
      }
    } finally {
      setPetLoading(false);
    }
  };

  // Update field form catatan vaksin.
  const handleRecordChange =
    (field: keyof typeof recordForm) => (event: ChangeEvent<HTMLInputElement>) => {
      const { value } = event.currentTarget;
      setRecordForm((prev) => ({ ...prev, [field]: value }));
    };

  // Submit catatan vaksin ke endpoint debug.
  const handleAddRecordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!recordForm.petId.trim()) {
      setRecordError('Pet ID is required.');
      return;
    }
    const givenAtValue = new Date(recordForm.givenAt);
    if (Number.isNaN(givenAtValue.getTime())) {
      setRecordError('Tanggal pemberian tidak valid.');
      pushLog({
        action: 'Add Medical Record',
        status: 'error',
        detail: 'Tanggal pemberian tidak valid.',
      });
      return;
    }
    const givenAtTimestamp = Math.floor(givenAtValue.getTime() / 1000);
    setRecordLoading(true);
    setRecordError('');
    pushLog({ action: 'Add Medical Record', status: 'info', detail: `Menulis rekam medis untuk pet #${recordForm.petId}` });
    setRecordTxHash('');
    try {
      const response = await fetch(buildUrl('/debug/add-medical-record'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          petId: Number(recordForm.petId),
          vaccineType: recordForm.vaccineType.trim(),
          batchNumber: recordForm.batchNumber.trim(),
          givenAt: givenAtTimestamp,
        }),
      });
      if (!response.ok) {
        throw new Error(await extractErrorMessage(response));
      }
      const data = await response.json().catch(() => ({}));
      setRecordTxHash((data as Record<string, unknown>).txHash?.toString() ?? 'Transaction submitted.');
      pushLog({
        action: 'Add Medical Record',
        status: 'success',
        detail:
          (data as Record<string, unknown>).txHash?.toString() ??
          `Rekam medis pet #${recordForm.petId} berhasil`,
      });
    } catch (error) {
      setRecordError(error instanceof Error ? error.message : 'Failed to add medical record.');
      pushLog({
        action: 'Add Medical Record',
        status: 'error',
        detail: error instanceof Error ? error.message : 'Gagal menulis rekam medis',
      });
    } finally {
      setRecordLoading(false);
    }
  };

  // Ambil semua catatan vaksin berdasarkan pet ID.
  const handleFetchRecords = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!recordsPetId.trim()) return;
    setRecordsLoading(true);
    setRecordsError('');
    setRecordsNotice('');
    setRecordsData(null);
    pushLog({
      action: 'Fetch Medical Records',
      status: 'info',
      detail: `Mengambil seluruh rekam medis pet #${recordsPetId.trim()}`,
    });
    try {
      const response = await fetch(buildUrl(`/debug/records/${recordsPetId.trim()}`));
      if (!response.ok) {
        throw new Error(await extractErrorMessage(response));
      }
      const data = await response.json();
      setRecordsData(data);
      setRecordsNotice('');
      pushLog({
        action: 'Fetch Medical Records',
        status: 'success',
        detail: `Rekam medis pet #${recordsPetId.trim()} diterima`,
      });
    } catch (error) {
      if (error instanceof Error && /id tidak ditemukan/i.test(error.message)) {
        setRecordsNotice(error.message);
        setRecordsError('');
        pushLog({
          action: 'Fetch Medical Records',
          status: 'info',
          detail: error.message,
        });
      } else {
        setRecordsError(error instanceof Error ? error.message : 'Failed to fetch medical records.');
        pushLog({
          action: 'Fetch Medical Records',
          status: 'error',
          detail: error instanceof Error ? error.message : 'Gagal mengambil rekam medis',
        });
      }
    } finally {
      setRecordsLoading(false);
    }
  };

  // Kelas UI agar tampilan konsisten di setiap kartu.
  const cardClass =
    'rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4';
  // Kelas tombol utama di halaman simulator.
  const buttonClass =
    'inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60';

  return (
    <div className="space-y-8 px-4 py-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Blockchain Simulator</h1>
        <p className="text-sm text-slate-600">
          Interact with the debug endpoints exposed by the backend to simulate on-chain actions.
        </p>
      </div>

      {/* Baris pertama: status jaringan + registrasi hewan */}
      <div className="grid gap-6 md:grid-cols-2">
        <section className={cardClass}>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Network Status</p>
            <p className="font-mono text-base text-slate-900">{API_BASE_URL}</p>
          </div>
          <button type="button" onClick={handlePing} className={buttonClass} disabled={networkLoading}>
            {networkLoading ? 'Pinging...' : 'Ping'}
          </button>
          {networkStatus !== 'idle' && (
            <p
              className={`text-sm ${
                networkStatus === 'success' ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {networkMessage}
            </p>
          )}
        </section>

        <section className={cardClass}>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Register Pet</p>
            <p className="text-sm text-slate-600">
              Submit a new pet to the blockchain simulator endpoint.
            </p>
          </div>
          <form className="space-y-3" onSubmit={handleRegisterSubmit}>
            <TextInput
              id="publicId"
              label="Public ID"
              value={registerForm.publicId}
              onChange={handleRegisterChange('publicId')}
              required
              placeholder="PET-123"
            />
            <TextInput
              id="name"
              label="Name"
              value={registerForm.name}
              onChange={handleRegisterChange('name')}
              required
            />
            <TextInput
              id="species"
              label="Species"
              value={registerForm.species}
              onChange={handleRegisterChange('species')}
              required
            />
            <TextInput
              id="breed"
              label="Breed"
              value={registerForm.breed}
              onChange={handleRegisterChange('breed')}
              required
            />
            <TextInput
              id="birthDate"
              label="Birth Date"
              type="date"
              value={registerForm.birthDate}
              onChange={handleRegisterChange('birthDate')}
              required
            />
            <button type="submit" className={buttonClass} disabled={registerLoading}>
              {registerLoading ? 'Submitting...' : 'Register Pet'}
            </button>
          </form>
          {registerError && <p className="text-sm text-red-600">{registerError}</p>}
          {registerTxHash && (
            <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700 space-y-1.5">
              <p className="font-semibold text-slate-900">Registrasi berhasil</p>
              <p className="text-xs text-slate-500">
                Pet tercatat di kontrak dan transaksi sudah final. Simpan txHash untuk audit:
              </p>
              <p className="font-mono break-all text-slate-700">{registerTxHash}</p>
            </div>
          )}
        </section>
      </div>

      {/* Baris kedua: fetch pet + tambah catatan vaksin */}
      <div className="grid gap-6 md:grid-cols-2">
        <section className={cardClass}>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Fetch Pet</p>
            <p className="text-sm text-slate-600">Retrieve the on-chain data for a single pet.</p>
          </div>
          <form className="space-y-3" onSubmit={handleFetchPet}>
            <TextInput
              id="fetchPetId"
              label="Pet ID"
              type="number"
              value={fetchPetId}
              onChange={(event) => setFetchPetId(event.currentTarget.value)}
              required
              placeholder="1"
            />
            <button type="submit" className={buttonClass} disabled={petLoading}>
              {petLoading ? 'Fetching...' : 'Fetch Pet'}
            </button>
          </form>
          {petError && <p className="text-sm text-red-600">{petError}</p>}
          {petNotice && !petError && (
            <p className="text-sm text-slate-600">{petNotice}</p>
          )}
          {petData !== null && (
            <pre className="max-h-64 overflow-auto rounded-lg bg-slate-900 p-4 text-xs text-green-200">
              {formatJson(petData)}
            </pre>
          )}
        </section>

        <section className={cardClass}>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Add Medical Record</p>
            <p className="text-sm text-slate-600">
              Attach a vaccine record to an existing pet for testing.
            </p>
          </div>
          <form className="space-y-3" onSubmit={handleAddRecordSubmit}>
            <TextInput
              id="recordPetId"
              label="Pet ID"
              type="number"
              value={recordForm.petId}
              onChange={handleRecordChange('petId')}
              required
              placeholder="1"
            />
            <TextInput
              id="vaccineType"
              label="Vaccine Type"
              value={recordForm.vaccineType}
              onChange={handleRecordChange('vaccineType')}
              required
            />
            <TextInput
              id="batchNumber"
              label="Batch Number"
              value={recordForm.batchNumber}
              onChange={handleRecordChange('batchNumber')}
              required
            />
            <TextInput
              id="givenAt"
              label="Given At"
              type="date"
              value={recordForm.givenAt}
              onChange={handleRecordChange('givenAt')}
              required
            />
            <button type="submit" className={buttonClass} disabled={recordLoading}>
              {recordLoading ? 'Saving...' : 'Add Record'}
            </button>
          </form>
          {recordError && <p className="text-sm text-red-600">{recordError}</p>}
          {recordTxHash && (
            <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700 space-y-1.5">
              <p className="font-semibold text-slate-900">Rekam medis tersimpan</p>
              <p className="text-xs text-slate-500">
                Catatan vaksin sudah dikirim ke blockchain. Gunakan txHash berikut untuk menelusuri transaksi:
              </p>
              <p className="font-mono break-all text-slate-700">{recordTxHash}</p>
            </div>
          )}
        </section>
      </div>

      {/* Baris ketiga: daftar catatan vaksin + log aktivitas */}
      <div className="grid gap-6 md:grid-cols-2">
        <section className={cardClass}>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Fetch Medical Records</p>
            <p className="text-sm text-slate-600">List all records tied to a pet ID.</p>
          </div>
          <form className="space-y-3" onSubmit={handleFetchRecords}>
            <TextInput
              id="recordsPetId"
              label="Pet ID"
              type="number"
              value={recordsPetId}
              onChange={(event) => setRecordsPetId(event.currentTarget.value)}
              required
              placeholder="1"
            />
            <button type="submit" className={buttonClass} disabled={recordsLoading}>
              {recordsLoading ? 'Fetching...' : 'Fetch Records'}
            </button>
          </form>
          {recordsError && <p className="text-sm text-red-600">{recordsError}</p>}
          {recordsNotice && !recordsError && (
            <p className="text-sm text-slate-600">{recordsNotice}</p>
          )}
          {recordsData !== null && (
            <pre className="max-h-64 overflow-auto rounded-lg bg-slate-900 p-4 text-xs text-green-200">
              {formatJson(recordsData)}
            </pre>
          )}
        </section>
        <section className={`${cardClass} md:col-span-1`}>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Aktivitas Blockchain</p>
            <p className="text-sm text-slate-600">
              Lihat setiap langkah perubahan data yang dikirim ke blockchain simulator.
              Jika <code className="font-mono text-xs">txHash</code> sudah muncul, berarti transaksi selesai.
              Bila hash belum tersedia karena proses masih berlangsung, cek catatan di bawah untuk memastikan
              tahapan apa saja yang sudah berjalan atau gagal.
            </p>
          </div>
          {activityLog.length === 0 ? (
            <p className="text-sm text-slate-500">Belum ada aktivitas. Cobalah kirim transaksi.</p>
          ) : (
            <ol className="space-y-3 text-sm">
              {activityLog.map((entry) => (
                <li
                  key={entry.id}
                  className={`rounded-xl border px-4 py-3 ${
                    entry.status === 'success'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : entry.status === 'error'
                        ? 'border-red-200 bg-red-50 text-red-700'
                        : 'border-slate-200 bg-slate-50 text-slate-700'
                  }`}
                >
                  <p className="text-xs font-semibold uppercase tracking-wide">{entry.action}</p>
                  <p className="text-sm">{entry.detail}</p>
                  <p className="text-xs text-slate-500">{formatTimestamp(entry.timestamp)}</p>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
};

export default BlockchainSimulatorPage;
