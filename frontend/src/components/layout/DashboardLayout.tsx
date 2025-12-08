import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import type { UserRole } from '../../types';

type NavLink = { label: string; to: string };

const navConfig: Record<UserRole, NavLink[]> = {
  OWNER: [
    { label: 'Dashboard', to: '/owner/dashboard' },
    { label: 'Daftar Hewan', to: '/owner/dashboard' },
    { label: 'Registrasi Hewan', to: '/owner/pets/new' },
    { label: 'Notifikasi', to: '/owner/notifications' },
  ],
  CLINIC: [
    { label: 'Dashboard', to: '/clinic/dashboard' },
    { label: 'Pending Vaksin', to: '/clinic/medical-records/pending' },
    { label: 'Koreksi Data', to: '/clinic/corrections' },
    { label: 'Notifikasi', to: '/clinic/notifications' },
  ],
  ADMIN: [{ label: 'Dashboard', to: '/admin/dashboard' }],
  PUBLIC_VERIFIER: [],
};

export const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  if (!user) return null;

  const links = navConfig[user.role] ?? [];

  return (
    <div className="min-h-screen bg-slate-100 flex">
      <aside className="w-64 bg-white shadow-lg hidden md:flex flex-col">
        <div className="p-4 border-b border-slate-200">
          <p className="text-lg font-semibold text-primary">Pet Identity</p>
          <p className="text-sm text-slate-500 capitalize">{user.role.toLowerCase()}</p>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`block rounded px-3 py-2 text-sm font-medium ${
                location.pathname === link.to
                  ? 'bg-primary text-white'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="flex-1 flex flex-col">
        <header className="bg-white shadow-sm border-b border-slate-200">
          <div className="px-6 py-4 flex justify-between items-center">
            <div>
              <p className="text-sm text-slate-500">Masuk sebagai</p>
              <p className="font-semibold">{user.name}</p>
            </div>
            <button
              onClick={logout}
              className="text-sm font-medium text-primary border border-primary px-4 py-2 rounded hover:bg-primary hover:text-white transition"
            >
              Keluar
            </button>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
