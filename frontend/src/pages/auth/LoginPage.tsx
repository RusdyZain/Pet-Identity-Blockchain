import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { TextField } from '../../components/forms/TextField';
import { useAuth } from '../../context/AuthContext';
import type { UserRole } from '../../types';

// Tujuan setelah login berdasarkan role.
const redirectMap: Record<UserRole, string> = {
  OWNER: '/owner/dashboard',
  CLINIC: '/clinic/dashboard',
  ADMIN: '/admin/dashboard',
  PUBLIC_VERIFIER: '/trace',
};

// Halaman login untuk semua role internal.
export const LoginPage = () => {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Submit form login dan simpan error jika gagal.
  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      const user = await login(email, password);
      navigate(redirectMap[user.role] ?? '/owner/dashboard', { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Gagal masuk. Pastikan kredensial benar.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-800">Masuk</h2>
        <p className="text-sm text-slate-500">Gunakan akun OWNER, CLINIC, atau ADMIN.</p>
      </div>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.currentTarget.value)}
          required
        />
        <TextField
          label="Password"
          type="password"
          value={password}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.currentTarget.value)}
          required
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-primary px-4 py-2 text-white font-semibold shadow-lg shadow-primary/30 disabled:opacity-60"
        >
          {loading ? 'Memproses...' : 'Masuk'}
        </button>
      </form>
      <div className="text-sm text-slate-500">
        <p>
          Akses publik untuk penelusuran identitas tersedia di halaman{' '}
          <button
            type="button"
            className="text-primary font-semibold"
            onClick={() => navigate('/trace')}
          >
            Trace
          </button>
          .
        </p>
      </div>
    </div>
  );
};
