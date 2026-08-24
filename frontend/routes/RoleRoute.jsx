import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Restricts a route subtree to specific user roles, e.g. <RoleRoute allow={['supervisor']} />
export default function RoleRoute({ allow = [] }) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (!allow.includes(user.role)) return <Navigate to="/404" replace />;

  return <Outlet />;
}
