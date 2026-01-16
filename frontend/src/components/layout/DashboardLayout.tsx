import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import type { UserRole } from '../../types';

type NavLink = { label: string; to: string; description?: string };

// Navigasi sidebar berdasarkan role pengguna.
const navConfig: Record<UserRole, NavLink[]> = {
  OWNER: [
    { label: 'Dashboard', to: '/owner/dashboard', description: 'Ringkasan hewan & vaksin' },
    { label: 'Registrasi Hewan', to: '/owner/pets/new', description: 'Tambah identitas baru' },
    { label: 'Notifikasi', to: '/owner/notifications', description: 'Info transfer & vaksin' },
  ],
  CLINIC: [
    { label: 'Dashboard', to: '/clinic/dashboard', description: 'Cari pasien & histori' },
    { label: 'Pending Vaksin', to: '/clinic/medical-records/pending', description: 'Verifikasi catatan' },
    { label: 'Koreksi Data', to: '/clinic/corrections', description: 'Review permintaan owner' },
    { label: 'Notifikasi', to: '/clinic/notifications', description: 'Update reguler' },
  ],
  ADMIN: [{ label: 'Dashboard', to: '/admin/dashboard', description: 'Statistik global' }],
  PUBLIC_VERIFIER: [],
};

// Layout utama untuk area dashboard (owner, clinic, admin).
export const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  if (!user) return null;

  // Ambil daftar menu sesuai role yang sedang login.
  const links = navConfig[user.role] ?? [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-mist via-white to-slate-100">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:flex-row md:py-10">
        <aside className="w-full rounded-3xl bg-white/80 p-6 shadow-[0_10px_30px_rgba(5,46,31,0.08)] backdrop-blur md:w-72">
          <div className="rounded-2xl bg-gradient-to-br from-primary to-emerald-600 p-5 text-white shadow-lg">
            <p className="text-xs uppercase tracking-[0.4em] text-white/70">Pet Identity</p>
            <p className="mt-2 text-2xl font-semibold">Klinik Digital</p>
            <p className="mt-3 text-sm text-white/80">
              {user.role === 'CLINIC'
                ? 'Kelola catatan medis dan validasi vaksin pasien Anda.'
                : user.role === 'OWNER'
                  ? 'Pantau kesehatan peliharaan dan kelola kepemilikan.'
                  : 'Monitor statistik jaringan dan insight tren.'}
            </p>
          </div>
          <nav className="mt-6 space-y-3">
            {links.map((link) => {
              // Tandai menu aktif sesuai path saat ini.
              const active = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`group block rounded-2xl border px-4 py-3 text-sm transition ${
                    active
                      ? 'border-transparent bg-mist text-primary shadow-sm'
                      : 'border-slate-200 text-slate-600 hover:border-primary/40 hover:bg-white'
                  }`}
                >
                  <p className="font-semibold">{link.label}</p>
                  {link.description && (
                    <p className="text-xs text-slate-400 group-hover:text-slate-500">{link.description}</p>
                  )}
                </Link>
              );
            })}
          </nav>
          <div className="mt-8 rounded-2xl border border-dashed border-primary/30 p-4 text-sm text-slate-500">
            <p className="font-semibold text-secondary">Butuh bantuan?</p>
            <p>Konsultasikan prosedur standar klinik dengan tim support kami.</p>
          </div>
        </aside>
        <div className="flex-1">
          <header className="flex flex-col gap-4 rounded-3xl bg-white/80 p-6 shadow-sm backdrop-blur md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-slate-400">Masuk sebagai</p>
              <p className="text-2xl font-semibold text-secondary">{user.name}</p>
              <p className="text-sm capitalize text-slate-500">{user.role.toLowerCase()}</p>
            </div>
            <button
              onClick={logout}
              className="inline-flex items-center justify-center rounded-full bg-secondary px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-secondary/30 transition hover:bg-primary"
            >
              Keluar
            </button>
          </header>
          <main className="mt-6 rounded-3xl bg-white/90 p-5 shadow-[0_15px_35px_rgba(15,118,110,0.08)] backdrop-blur">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};
