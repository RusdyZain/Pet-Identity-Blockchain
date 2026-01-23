import { useEffect, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/common/PageHeader';
import { TextField } from '../../components/forms/TextField';
import { useAuth } from '../../context/AuthContext';
import { ownerAccountApi } from '../../services/apiClient';

// Halaman pengelolaan akun untuk owner.
export const OwnerAccountPage = () => {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: user?.name ?? '',
    email: user?.email ?? '',
    password: '',
    passwordConfirm: '',
  });
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Ambil profil terbaru dari backend saat halaman dibuka.
  useEffect(() => {
    let active = true;
    const loadProfile = async () => {
      setLoadingProfile(true);
      try {
        const profile = await ownerAccountApi.profile();
        if (!active) return;
        setForm((prev) => ({
          ...prev,
          name: profile.name,
          email: profile.email,
        }));
        setWalletAddress(profile.walletAddress ?? null);
      } catch (err: any) {
        if (!active) return;
        setError(err?.response?.data?.message ?? 'Gagal memuat profil.');
      } finally {
        if (active) {
          setLoadingProfile(false);
        }
      }
    };

    loadProfile();
    return () => {
      active = false;
    };
  }, []);

  // Helper update field form.
  const handleChange =
    (field: keyof typeof form) => (event: ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }));
    };

  // Submit perubahan profil.
  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!form.name.trim() || !form.email.trim()) {
      setError('Nama dan email wajib diisi.');
      return;
    }

    if (form.password && form.password !== form.passwordConfirm) {
      setError('Konfirmasi password tidak sama.');
      return;
    }

    setSaving(true);
    try {
      const payload: { name: string; email: string; password?: string } = {
        name: form.name.trim(),
        email: form.email.trim(),
      };
      if (form.password) {
        payload.password = form.password;
      }
      const updated = await ownerAccountApi.update(payload);
      updateUser({
        id: updated.id,
        name: updated.name,
        email: updated.email,
        role: updated.role,
      });
      setWalletAddress(updated.walletAddress ?? null);
      setForm((prev) => ({
        ...prev,
        password: '',
        passwordConfirm: '',
      }));
      setSuccess('Profil berhasil diperbarui.');
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Gagal memperbarui profil.');
    } finally {
      setSaving(false);
    }
  };

  // Hapus akun owner.
  const handleDelete = async () => {
    const confirmed = window.confirm(
      'Hapus akun ini? Pastikan seluruh hewan sudah ditransfer.'
    );
    if (!confirmed) return;
    setError('');
    setSuccess('');
    setDeleting(true);
    try {
      await ownerAccountApi.remove();
      logout();
      navigate('/register', { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Gagal menghapus akun.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title="Akun Pemilik Hewan"
        description="Kelola identitas akun dan keamanan akses dashboard Anda."
      />
      <section className="rounded-3xl border border-white/60 bg-white/90 p-6 shadow-lg shadow-primary/5">
        <h3 className="text-lg font-semibold text-secondary">Profil</h3>
        <p className="mt-1 text-sm text-slate-500">Perbarui nama, email, dan password.</p>
        {loadingProfile ? (
          <p className="mt-4 text-sm text-slate-500">Memuat profil...</p>
        ) : (
          <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
            <TextField label="Nama Lengkap" value={form.name} onChange={handleChange('name')} required />
            <TextField
              label="Email"
              type="email"
              value={form.email}
              onChange={handleChange('email')}
              required
            />
            <TextField
              label="Password Baru"
              type="password"
              value={form.password}
              onChange={handleChange('password')}
              placeholder="Kosongkan jika tidak ingin mengganti"
            />
            <TextField
              label="Konfirmasi Password Baru"
              type="password"
              value={form.passwordConfirm}
              onChange={handleChange('passwordConfirm')}
              placeholder="Ulangi password baru"
            />
            {walletAddress && (
              <div className="rounded-2xl bg-mist/70 px-4 py-3 text-xs text-slate-500">
                <p className="font-semibold text-secondary">Wallet terhubung</p>
                <p className="mt-1 break-all">{walletAddress}</p>
              </div>
            )}
            {error && <p className="text-sm text-red-600">{error}</p>}
            {success && <p className="text-sm text-green-600">{success}</p>}
            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-full bg-primary px-5 py-2 text-white font-semibold shadow-lg shadow-primary/30 disabled:opacity-60"
              >
                {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
              <button
                type="button"
                className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600"
                onClick={() => navigate('/owner/dashboard')}
              >
                Kembali
              </button>
            </div>
          </form>
        )}
      </section>
      <section className="rounded-3xl border border-red-100 bg-red-50/70 p-6">
        <h3 className="text-lg font-semibold text-red-700">Hapus Akun</h3>
        <p className="mt-2 text-sm text-red-600">
          Tindakan ini permanen dan hanya bisa dilakukan jika tidak ada data terkait.
        </p>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="mt-4 inline-flex items-center rounded-full border border-red-300 px-5 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-60"
        >
          {deleting ? 'Menghapus...' : 'Hapus Akun'}
        </button>
      </section>
    </div>
  );
};
