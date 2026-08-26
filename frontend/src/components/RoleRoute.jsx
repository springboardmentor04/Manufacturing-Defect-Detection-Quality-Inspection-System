import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// If the logged-in user's role isn't in `roles`, redirect to the dashboard —
// mirrors the original router() falling back to routes[Object.keys(routes)[0]]
// when the current hash isn't a valid route for that role.
export default function RoleRoute({ roles, children }) {
  const { user } = useAuth();
  if (!roles.includes(user.role)) return <Navigate to="/app/dashboard" replace />;
  return children;
}
