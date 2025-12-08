import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { medicalRecordApi } from '../../services/apiClient';
import { TextField } from '../../components/forms/TextField';
import { PageHeader } from '../../components/common/PageHeader';

export const ClinicMedicalRecordForm = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    vaccine_type: '',
    batch_number: '',
    given_at: '',
    notes: '',
    evidence_url: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange =
    (field: keyof typeof form) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!id) return;
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await medicalRecordApi.create(id, form);
      setSuccess('Catatan medis berhasil dibuat dan menunggu verifikasi.');
      setTimeout(() => navigate(`/clinic/pets/${id}`), 1200);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Gagal menyimpan catatan medis');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Tambah Catatan Vaksin"
        description="Catatan baru otomatis berstatus PENDING sampai diverifikasi petugas klinik."
      />
      <form className="space-y-4 bg-white p-6 rounded shadow" onSubmit={handleSubmit}>
        <TextField
          label="Jenis Vaksin"
          value={form.vaccine_type}
          onChange={handleChange('vaccine_type')}
          required
        />
        <TextField
          label="Nomor Batch"
          value={form.batch_number}
          onChange={handleChange('batch_number')}
          required
        />
        <TextField
          label="Tanggal Pemberian"
          type="date"
          value={form.given_at}
          onChange={handleChange('given_at')}
          required
        />
        <TextField label="Catatan" textarea value={form.notes} onChange={handleChange('notes')} />
        <TextField
          label="Link Bukti (opsional)"
          type="url"
          value={form.evidence_url}
          onChange={handleChange('evidence_url')}
          placeholder="https://"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-green-600">{success}</p>}
        <div className="flex gap-3">
          <button type="submit" className="rounded bg-primary px-4 py-2 text-white" disabled={loading}>
            {loading ? 'Menyimpan...' : 'Simpan'}
          </button>
          <button type="button" className="rounded border px-4 py-2 text-sm" onClick={() => navigate(-1)}>
            Batal
          </button>
        </div>
      </form>
    </div>
  );
};
