import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { petApi } from '../../services/apiClient';
import { TextField } from '../../components/forms/TextField';
import { PageHeader } from '../../components/common/PageHeader';

export const OwnerTransferPage = () => {
  const { id } = useParams<{ id: string }>();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!id) return;
    setLoading(true);
    setMessage('');
    setError('');
    try {
      await petApi.initiateTransfer(id, email);
      setMessage('Permintaan transfer dikirim. Pemilik baru harus menerima via aplikasi.');
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Gagal mengirim permintaan transfer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl">
      <PageHeader title="Transfer Kepemilikan" />
      <form className="space-y-4 bg-white p-6 rounded shadow" onSubmit={handleSubmit}>
        <TextField
          label="Email Calon Pemilik Baru"
          type="email"
          value={email}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.currentTarget.value)}
          required
        />
        {message && <p className="text-sm text-green-600">{message}</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" className="rounded bg-primary px-4 py-2 text-white" disabled={loading}>
          {loading ? 'Mengirim...' : 'Kirim Permintaan'}
        </button>
      </form>
    </div>
  );
};
