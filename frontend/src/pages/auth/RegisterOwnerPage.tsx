import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { TextField } from '../../components/forms/TextField';
import { authApi } from '../../services/apiClient';
import { connectWallet, signAuthChallenge } from '../../services/walletClient';

// Halaman registrasi khusus pemilik hewan.
export const RegisterOwnerPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [walletAddress, setWalletAddress] = useState('');

  // Helper untuk update form field.
  const handleChange =
    (field: keyof typeof form) => (event: ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }));
    };

  // Submit registrasi owner.
  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!form.name.trim() || !form.email.trim()) {
      setError('Nama dan email wajib diisi.');
      return;
    }

    setLoading(true);
    try {
      const connectedWallet = await connectWallet();
      setWalletAddress(connectedWallet);
      const authPayload = await signAuthChallenge(connectedWallet);

      await authApi.register({
        name: form.name.trim(),
        email: form.email.trim(),
        role: 'OWNER',
        walletAddress: connectedWallet,
        message: authPayload.message,
        signature: authPayload.signature,
      });
      setSuccess('Registrasi wallet berhasil. Silakan login.');
      setTimeout(() => navigate('/login'), 1200);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? err?.message ?? 'Registrasi gagal. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-800">Daftar Pemilik Hewan</h2>
        <p className="text-sm text-slate-500">
          Lengkapi data akun untuk mengakses layanan registrasi dan riwayat vaksin.
        </p>
        <p className="mt-2 rounded-xl bg-mist/70 px-3 py-2 text-xs text-slate-600">
          Halaman ini khusus role OWNER. Akun CLINIC dan ADMIN dikelola terpisah oleh administrator.
        </p>
      </div>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <TextField
          label="Nama Lengkap"
          value={form.name}
          onChange={handleChange('name')}
          required
        />
        <TextField
          label="Email"
          type="email"
          value={form.email}
          onChange={handleChange('email')}
          required
        />
        {walletAddress && (
          <p className="rounded-lg bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700">
            Wallet: {walletAddress}
          </p>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-green-600">{success}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-primary px-4 py-2 text-white font-semibold shadow-lg shadow-primary/30 disabled:opacity-60"
        >
          {loading ? 'Memproses...' : 'Daftar'}
        </button>
      </form>
      <div className="text-sm text-slate-500">
        <p>
          Sudah punya akun?{' '}
          <button
            type="button"
            className="text-primary font-semibold"
            onClick={() => navigate('/login')}
          >
            Masuk di sini
          </button>
          .
        </p>
      </div>
    </div>
  );
};
