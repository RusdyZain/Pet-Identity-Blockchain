import { useEffect, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { TextField } from '../../components/forms/TextField';
import { Loader } from '../../components/common/Loader';
import { adminApi } from '../../services/apiClient';
import { useAuth } from '../../context/AuthContext';
import type { AdminUser, UserRole } from '../../types';

const roleOptions: Array<{ value: UserRole; label: string }> = [
  { value: 'OWNER', label: 'Owner' },
  { value: 'CLINIC', label: 'Clinic' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'PUBLIC_VERIFIER', label: 'Public Verifier' },
];

const filterOptions: Array<{ value: string; label: string }> = [
  { value: 'ALL', label: 'Semua Role' },
  ...roleOptions.map((role) => ({ value: role.value, label: role.label })),
];

const emptyForm = {
  id: null as number | null,
  name: '',
  email: '',
  role: 'OWNER' as UserRole,
  password: '',
};

// Halaman admin untuk CRUD akun dan peran.
export const AdminUsersPage = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(emptyForm);

  const isEditing = form.id !== null;

  const selectClass =
    'mt-1 w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-2.5 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 transition';

  const loadUsers = async (options?: { role?: string; search?: string }) => {
    setLoading(true);
    setError('');
    try {
      const data = await adminApi.listUsers(options);
      setUsers(data);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Gagal memuat data akun.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleFilter = async () => {
    const role = roleFilter !== 'ALL' ? roleFilter : undefined;
    const searchValue = search.trim() || undefined;
    await loadUsers({ role, search: searchValue });
  };

  const handleFormChange =
    (field: keyof typeof form) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const resetForm = () => {
    setForm(emptyForm);
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!form.name.trim() || !form.email.trim()) {
      setError('Nama dan email wajib diisi.');
      return;
    }

    if (!isEditing && !form.password) {
      setError('Password wajib diisi untuk akun baru.');
      return;
    }

    setSaving(true);
    try {
      if (isEditing && form.id) {
        await adminApi.updateUser(form.id, {
          name: form.name.trim(),
          email: form.email.trim(),
          role: form.role,
          ...(form.password ? { password: form.password } : {}),
        });
        setSuccess('Akun berhasil diperbarui.');
      } else {
        await adminApi.createUser({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          role: form.role,
        });
        setSuccess('Akun baru berhasil dibuat.');
      }
      await handleFilter();
      resetForm();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Gagal menyimpan data akun.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (target: AdminUser) => {
    setForm({
      id: target.id,
      name: target.name,
      email: target.email,
      role: target.role,
      password: '',
    });
    setSuccess('');
    setError('');
  };

  const handleDelete = async (target: AdminUser) => {
    if (currentUser?.id === target.id) {
      setError('Tidak bisa menghapus akun sendiri.');
      return;
    }
    const confirmed = window.confirm(`Hapus akun ${target.name}?`);
    if (!confirmed) return;

    setError('');
    setSuccess('');
    try {
      await adminApi.deleteUser(target.id);
      setSuccess('Akun berhasil dihapus.');
      await handleFilter();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Gagal menghapus akun.');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kelola Akun & Peran"
        description="Admin dapat membuat, memperbarui, dan menghapus akun untuk semua role."
      />

      <section className="rounded-3xl border border-white/60 bg-white/90 p-6 shadow-lg shadow-primary/5">
        <h3 className="text-lg font-semibold text-secondary">
          {isEditing ? 'Perbarui Akun' : 'Buat Akun Baru'}
        </h3>
        <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
          <TextField label="Nama" value={form.name} onChange={handleFormChange('name')} required />
          <TextField
            label="Email"
            type="email"
            value={form.email}
            onChange={handleFormChange('email')}
            required
          />
          <label className="block text-sm font-semibold text-secondary/80">
            Role
            <select className={selectClass} value={form.role} onChange={handleFormChange('role')}>
              {roleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <TextField
            label={isEditing ? 'Password Baru (opsional)' : 'Password'}
            type="password"
            value={form.password}
            onChange={handleFormChange('password')}
            required={!isEditing}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-green-600">{success}</p>}
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-primary px-5 py-2 text-white font-semibold shadow-lg shadow-primary/30 disabled:opacity-60"
            >
              {saving ? 'Menyimpan...' : isEditing ? 'Simpan Perubahan' : 'Buat Akun'}
            </button>
            {isEditing && (
              <button
                type="button"
                className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600"
                onClick={resetForm}
              >
                Batal Edit
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="rounded-3xl border border-white/60 bg-white/90 p-6 shadow-lg shadow-primary/5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-secondary">Daftar Akun Terdaftar</h3>
            <p className="text-sm text-slate-500">Filter role, cari nama/email, dan kelola akun.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <label className="block text-sm font-semibold text-secondary/80">
              Filter Role
              <select
                className={selectClass}
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value)}
              >
                {filterOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="min-w-[220px]">
              <TextField
                label="Cari"
                value={search}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setSearch(event.target.value)}
                placeholder="Nama atau email"
              />
            </div>
            <button
              type="button"
              onClick={handleFilter}
              className="h-11 self-end rounded-full bg-secondary px-5 text-sm font-semibold text-white shadow-lg shadow-secondary/30"
            >
              Terapkan
            </button>
          </div>
        </div>

        {loading && <div className="mt-4"><Loader label="Memuat akun..." /></div>}
        {!loading && users.length === 0 && (
          <p className="mt-4 text-sm text-slate-500">Belum ada akun terdaftar.</p>
        )}
        {!loading && users.length > 0 && (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-3 py-2">Nama</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Role</th>
                  <th className="px-3 py-2">Wallet</th>
                  <th className="px-3 py-2 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {users.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100">
                    <td className="px-3 py-3 font-semibold text-secondary">{item.name}</td>
                    <td className="px-3 py-3 text-slate-500">{item.email}</td>
                    <td className="px-3 py-3 text-slate-500">{item.role}</td>
                    <td className="px-3 py-3 text-xs text-slate-400">
                      {item.walletAddress ?? '-'}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600"
                          onClick={() => handleEdit(item)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="rounded-full border border-red-200 px-3 py-1 text-xs text-red-600"
                          onClick={() => handleDelete(item)}
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
