import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Loader from '../components/common/Loader';

// Blocks access to any nested route unless the user is authenticated.
export default function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <Loader fullPage />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return <Outlet />;
}
