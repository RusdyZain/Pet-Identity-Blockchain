import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
  redirectTo?: string;
}

const roleRedirectMap: Record<UserRole, string> = {
  OWNER: '/owner/dashboard',
  CLINIC: '/clinic/dashboard',
  ADMIN: '/admin/dashboard',
  PUBLIC_VERIFIER: '/trace',
};

export const ProtectedRoute = ({
  allowedRoles,
  redirectTo = '/login',
}: ProtectedRouteProps) => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    const fallback = roleRedirectMap[user.role] ?? redirectTo;
    return <Navigate to={fallback} replace />;
  }

  return <Outlet />;
};
