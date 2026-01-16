import { useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { petApi, correctionApi } from '../../services/apiClient';
import { useEffect } from 'react';
import type { Pet } from '../../types';
import { TextField } from '../../components/forms/TextField';
import { SelectField } from '../../components/forms/SelectField';
import { PageHeader } from '../../components/common/PageHeader';
import { Loader } from '../../components/common/Loader';

// Daftar field yang bisa diajukan koreksinya.
const fieldOptions = [
  { label: 'Nama', value: 'name', key: 'name' as const },
  { label: 'Jenis', value: 'species', key: 'species' as const },
  { label: 'Ras', value: 'breed', key: 'breed' as const },
  { label: 'Tanggal Lahir', value: 'birth_date', key: 'birthDate' as const },
  { label: 'Warna', value: 'color', key: 'color' as const },
  { label: 'Ciri Fisik', value: 'physical_mark', key: 'physicalMark' as const },
];

// Form pengajuan koreksi data hewan oleh pemilik.
export const OwnerCorrectionForm = () => {
  const { id } = useParams<{ id: string }>();
  const [pet, setPet] = useState<Pet | null>(null);
  const [field, setField] = useState(fieldOptions[0].value);
  const [newValue, setNewValue] = useState('');
  const [reason, setReason] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // Ambil data hewan agar nilai saat ini bisa ditampilkan.
  useEffect(() => {
    const loadPet = async () => {
      if (!id) return;
      setLoading(true);
      setError('');
      try {
        const data = await petApi.detail(id);
        setPet(data);
      } catch (err: any) {
        setError(err?.response?.data?.message ?? 'Gagal memuat data hewan.');
      } finally {
        setLoading(false);
      }
    };
    loadPet();
  }, [id]);

  // Hitung nilai saat ini berdasarkan field yang dipilih.
  const currentValue = useMemo(() => {
    if (!pet) return '-';

    const selected = fieldOptions.find((option) => option.value === field);
    if (!selected) return '-';

    const value = (pet as any)[selected.key];
    if (selected.value === 'birth_date') {
      return new Date(pet.birthDate).toISOString().split('T')[0];
    }
    return value ?? '-';
  }, [field, pet]);

  // Kirim permintaan koreksi ke API.
  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!id) return;
    setError('');
    setSuccess('');
    try {
      await correctionApi.create(id, { field_name: field, new_value: newValue, reason });
      setSuccess('Permintaan koreksi berhasil dikirim.');
      setNewValue('');
      setReason('');
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Gagal mengirim koreksi.');
    }
  };

  if (loading) return <Loader label="Memuat data..." />;
  if (!pet) return <p className="text-sm text-red-600">Data hewan tidak ditemukan.</p>;

  return (
    <div className="max-w-2xl space-y-4">
      <PageHeader title="Ajukan Koreksi Data" />
      <form
        className="space-y-4 rounded-3xl border border-white/60 bg-white/90 p-6 shadow-lg shadow-primary/5"
        onSubmit={handleSubmit}
      >
        <SelectField
          label="Field yang dikoreksi"
          value={field}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => setField(e.currentTarget.value)}
          options={fieldOptions.map((option) => ({ value: option.value, label: option.label }))}
        />
        <TextField label="Nilai saat ini" value={currentValue} disabled />
        <TextField
          label="Nilai baru"
          value={newValue}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setNewValue(e.currentTarget.value)}
          required
        />
        <TextField
          label="Alasan (opsional)"
          textarea
          value={reason}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setReason(e.currentTarget.value)}
          placeholder="Berikan penjelasan singkat"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-green-600">{success}</p>}
        <button
          type="submit"
          className="rounded-full bg-primary px-5 py-2 text-white font-semibold shadow-lg shadow-primary/30"
        >
          Kirim
        </button>
      </form>
    </div>
  );
};
