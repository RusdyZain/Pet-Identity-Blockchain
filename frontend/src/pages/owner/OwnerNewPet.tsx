import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { petApi } from '../../services/apiClient';
import { TextField } from '../../components/forms/TextField';
import { PageHeader } from '../../components/common/PageHeader';

// Form registrasi hewan baru untuk pemilik.
export const OwnerNewPet = () => {
  const [form, setForm] = useState({
    name: '',
    species: '',
    breed: '',
    birth_date: '',
    color: '',
    physical_mark: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Helper untuk update nilai form berdasarkan field.
  const handleChange =
    (field: keyof typeof form) => (event: ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }));
    };

  // Submit data registrasi ke API.
  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await petApi.create(form);
      setSuccess('Hewan berhasil didaftarkan!');
      setTimeout(() => navigate('/owner/dashboard'), 1200);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Gagal mendaftarkan hewan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Registrasi Identitas Hewan"
        description="Masukkan data identitas sesuai dokumen resmi dan hasil verifikasi klinik."
      />
      <form
        className="space-y-4 rounded-3xl border border-white/60 bg-white/90 p-6 shadow-lg shadow-primary/5"
        onSubmit={handleSubmit}
      >
        <TextField label="Nama Hewan" value={form.name} onChange={handleChange('name')} required />
        <TextField label="Jenis (species)" value={form.species} onChange={handleChange('species')} required />
        <TextField label="Ras (breed)" value={form.breed} onChange={handleChange('breed')} required />
        <TextField label="Tanggal Lahir" type="date" value={form.birth_date} onChange={handleChange('birth_date')} required />
        <TextField label="Warna" value={form.color} onChange={handleChange('color')} required />
        <TextField
          label="Ciri Fisik"
          value={form.physical_mark}
          onChange={handleChange('physical_mark')}
          required
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-green-600">{success}</p>}
        <div className="flex gap-3">
          <button
            type="submit"
            className="rounded-full bg-primary px-5 py-2 text-white font-semibold shadow-lg shadow-primary/30"
            disabled={loading}
          >
            {loading ? 'Menyimpan...' : 'Simpan'}
          </button>
          <button
            type="button"
            className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600"
            onClick={() => navigate(-1)}
          >
            Batal
          </button>
        </div>
      </form>
    </div>
  );
};
