import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';

const rawBaseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';
const API_BASE_URL = rawBaseUrl.endsWith('/') ? rawBaseUrl.slice(0, -1) : rawBaseUrl;

const buildUrl = (path: string) => `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;

const formatJson = (value: unknown) => {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

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

export const BlockchainSimulatorPage = () => {
  const [networkStatus, setNetworkStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [networkMessage, setNetworkMessage] = useState('');
  const [networkLoading, setNetworkLoading] = useState(false);

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

  const [fetchPetId, setFetchPetId] = useState('');
  const [petLoading, setPetLoading] = useState(false);
  const [petError, setPetError] = useState('');
  const [petData, setPetData] = useState<unknown | null>(null);

  const [recordForm, setRecordForm] = useState({
    petId: '',
    vaccineType: '',
    batchNumber: '',
    givenAt: '',
  });
  const [recordLoading, setRecordLoading] = useState(false);
  const [recordError, setRecordError] = useState('');
  const [recordTxHash, setRecordTxHash] = useState('');

  const [recordsPetId, setRecordsPetId] = useState('');
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [recordsError, setRecordsError] = useState('');
  const [recordsData, setRecordsData] = useState<unknown | null>(null);

  const handlePing = async () => {
    setNetworkLoading(true);
    setNetworkStatus('idle');
    setNetworkMessage('');
    try {
      const response = await fetch(buildUrl('/api/health'));
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
    } catch (error) {
      setNetworkStatus('error');
      setNetworkMessage(error instanceof Error ? error.message : 'Ping failed.');
    } finally {
      setNetworkLoading(false);
    }
  };

  const handleRegisterChange =
    (field: keyof typeof registerForm) => (event: ChangeEvent<HTMLInputElement>) => {
      const { value } = event.currentTarget;
      setRegisterForm((prev) => ({ ...prev, [field]: value }));
    };

  const handleRegisterSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setRegisterLoading(true);
    setRegisterError('');
    setRegisterTxHash('');
    try {
      const response = await fetch(buildUrl('/api/debug/register-pet'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          publicId: registerForm.publicId.trim(),
          name: registerForm.name.trim(),
          species: registerForm.species.trim(),
          breed: registerForm.breed.trim(),
          birthDate: registerForm.birthDate,
        }),
      });
      if (!response.ok) {
        throw new Error(await extractErrorMessage(response));
      }
      const data = await response.json().catch(() => ({}));
      setRegisterTxHash((data as Record<string, unknown>).txHash?.toString() ?? 'Transaction submitted.');
    } catch (error) {
      setRegisterError(error instanceof Error ? error.message : 'Failed to register pet.');
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleFetchPet = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!fetchPetId.trim()) return;
    setPetLoading(true);
    setPetError('');
    setPetData(null);
    try {
      const response = await fetch(buildUrl(`/api/debug/pet/${fetchPetId.trim()}`));
      if (!response.ok) {
        throw new Error(await extractErrorMessage(response));
      }
      const data = await response.json();
      setPetData(data);
    } catch (error) {
      setPetError(error instanceof Error ? error.message : 'Failed to fetch pet.');
    } finally {
      setPetLoading(false);
    }
  };

  const handleRecordChange =
    (field: keyof typeof recordForm) => (event: ChangeEvent<HTMLInputElement>) => {
      const { value } = event.currentTarget;
      setRecordForm((prev) => ({ ...prev, [field]: value }));
    };

  const handleAddRecordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!recordForm.petId.trim()) {
      setRecordError('Pet ID is required.');
      return;
    }
    setRecordLoading(true);
    setRecordError('');
    setRecordTxHash('');
    try {
      const response = await fetch(buildUrl('/api/debug/add-medical-record'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          petId: Number(recordForm.petId),
          vaccineType: recordForm.vaccineType.trim(),
          batchNumber: recordForm.batchNumber.trim(),
          givenAt: recordForm.givenAt,
        }),
      });
      if (!response.ok) {
        throw new Error(await extractErrorMessage(response));
      }
      const data = await response.json().catch(() => ({}));
      setRecordTxHash((data as Record<string, unknown>).txHash?.toString() ?? 'Transaction submitted.');
    } catch (error) {
      setRecordError(error instanceof Error ? error.message : 'Failed to add medical record.');
    } finally {
      setRecordLoading(false);
    }
  };

  const handleFetchRecords = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!recordsPetId.trim()) return;
    setRecordsLoading(true);
    setRecordsError('');
    setRecordsData(null);
    try {
      const response = await fetch(buildUrl(`/api/debug/records/${recordsPetId.trim()}`));
      if (!response.ok) {
        throw new Error(await extractErrorMessage(response));
      }
      const data = await response.json();
      setRecordsData(data);
    } catch (error) {
      setRecordsError(error instanceof Error ? error.message : 'Failed to fetch medical records.');
    } finally {
      setRecordsLoading(false);
    }
  };

  const cardClass =
    'rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4';
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
            <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">txHash</p>
              <p className="font-mono break-all text-slate-700">{registerTxHash}</p>
            </div>
          )}
        </section>
      </div>

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
            <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">txHash</p>
              <p className="font-mono break-all text-slate-700">{recordTxHash}</p>
            </div>
          )}
        </section>
      </div>

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
          {recordsData !== null && (
            <pre className="max-h-64 overflow-auto rounded-lg bg-slate-900 p-4 text-xs text-green-200">
              {formatJson(recordsData)}
            </pre>
          )}
        </section>
      </div>
    </div>
  );
};

export default BlockchainSimulatorPage;
