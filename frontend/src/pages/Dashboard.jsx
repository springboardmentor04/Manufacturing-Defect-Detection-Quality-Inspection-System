import { useAuth } from '../context/AuthContext';
import QEDashboard from './QEDashboard';
import SupDashboard from './SupDashboard';

export default function Dashboard() {
  const { user } = useAuth();
  return user.role === 'supervisor' ? <SupDashboard /> : <QEDashboard />;
}
