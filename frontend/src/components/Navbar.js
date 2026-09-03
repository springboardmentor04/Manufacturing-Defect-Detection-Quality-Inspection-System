import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ROLE_BADGE = {
  admin: 'bg-red-100 text-red-700',
  supervisor: 'bg-blue-100 text-blue-700',
  quality_engineer: 'bg-green-100 text-green-700',
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  const navLink = (to, label) => {
    const active = location.pathname === to;
    return (
      <Link
        to={to}
        onClick={() => setMenuOpen(false)}
        className={`text-sm font-medium transition-colors ${
          active ? 'text-indigo-600 border-b-2 border-indigo-600 pb-0.5' : 'text-gray-600 hover:text-indigo-600'
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-3">
      <div className="flex items-center justify-between">
        {/* Logo */}
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2v-4M9 21H5a2 2 0 01-2-2v-4m0 0h18" />
            </svg>
          </div>
          <span className="text-lg font-bold text-indigo-600">VisionInspect <span className="text-gray-800">AI</span></span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-5">
          {navLink('/dashboard', 'Dashboard')}
          {navLink('/inspections', 'Inspections')}
          {navLink('/datasets', 'Datasets')}
          {(user?.role === 'admin' || user?.role === 'supervisor') && navLink('/users', 'Users')}
          <Link
            to="/upload"
            className="bg-indigo-600 text-white text-sm font-medium px-4 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            + Upload
          </Link>
        </div>

        {/* User Info + Logout */}
        <div className="hidden md:flex items-center gap-3">
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${ROLE_BADGE[user?.role] || ''}`}>
            {user?.role?.replace('_', ' ')}
          </span>
          <span className="text-sm text-gray-700 font-medium">{user?.full_name}</span>
          <button
            onClick={handleLogout}
            className="text-sm text-red-500 hover:text-red-700 border border-red-200 hover:border-red-400 px-3 py-1 rounded-lg transition-colors"
          >
            Logout
          </button>
        </div>

        {/* Mobile Hamburger */}
        <button
          className="md:hidden text-gray-600 hover:text-indigo-600"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden mt-3 pb-3 flex flex-col gap-3 border-t border-gray-100 pt-3">
          {navLink('/dashboard', 'Dashboard')}
          {navLink('/inspections', 'Inspections')}
          {navLink('/datasets', 'Datasets')}
          {(user?.role === 'admin' || user?.role === 'supervisor') && navLink('/users', 'Users')}
          <Link to="/upload" onClick={() => setMenuOpen(false)}
            className="bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-700 text-center">
            + Upload
          </Link>
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${ROLE_BADGE[user?.role] || ''}`}>
                {user?.role?.replace('_', ' ')}
              </span>
              <span className="text-sm text-gray-700">{user?.full_name}</span>
            </div>
            <button onClick={handleLogout} className="text-sm text-red-500 hover:text-red-700">Logout</button>
          </div>
        </div>
      )}
    </nav>
  );
}
