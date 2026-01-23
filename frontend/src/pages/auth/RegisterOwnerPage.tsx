import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { TextField } from '../../components/forms/TextField';
import { authApi } from '../../services/apiClient';

// Halaman registrasi khusus pemilik hewan.
export const RegisterOwnerPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    passwordConfirm: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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

    if (!form.name.trim() || !form.email.trim() || !form.password) {
      setError('Nama, email, dan password wajib diisi.');
      return;
    }

    if (form.password !== form.passwordConfirm) {
      setError('Konfirmasi password tidak sama.');
      return;
    }

    setLoading(true);
    try {
      await authApi.register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: 'OWNER',
      });
      setSuccess('Registrasi berhasil. Silakan login.');
      setTimeout(() => navigate('/login'), 1200);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Registrasi gagal. Coba lagi.');
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
        <TextField
          label="Password"
          type="password"
          value={form.password}
          onChange={handleChange('password')}
          required
        />
        <TextField
          label="Konfirmasi Password"
          type="password"
          value={form.passwordConfirm}
          onChange={handleChange('passwordConfirm')}
          required
        />
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
