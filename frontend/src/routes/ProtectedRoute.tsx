import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
  redirectTo?: string;
}

// Peta tujuan default per role jika akses tidak sesuai.
const roleRedirectMap: Record<UserRole, string> = {
  OWNER: '/owner/dashboard',
  CLINIC: '/clinic/dashboard',
  ADMIN: '/admin/dashboard',
  PUBLIC_VERIFIER: '/trace',
};

// Komponen pembatas akses rute berbasis status login dan role.
export const ProtectedRoute = ({
  allowedRoles,
  redirectTo = '/login',
}: ProtectedRouteProps) => {
  const { isAuthenticated, user } = useAuth();

  // Pengguna belum login diarahkan ke halaman login.
  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  // Role tidak sesuai diarahkan ke dashboard sesuai role.
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    const fallback = roleRedirectMap[user.role] ?? redirectTo;
    return <Navigate to={fallback} replace />;
  }

  // Jika lolos semua syarat, tampilkan rute anak.
  return <Outlet />;
};
