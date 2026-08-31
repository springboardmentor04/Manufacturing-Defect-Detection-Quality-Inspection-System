import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout.jsx';
import { Users, UserPlus, Search, ShieldCheck, Trash2, Edit2, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react';

export default function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'Quality Engineer' });
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch('/api/v1/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      } else {
        setError('Unable to load data.');
      }
    } catch (err) {
      console.error("Failed to fetch users:", err);
      setError('Unable to load data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddUser = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch('/api/v1/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          full_name: newUser.name,
          email: newUser.email,
          password: newUser.password || 'password123',
          role_name: newUser.role
        })
      });

      if (res.ok) {
        await fetchUsers();
        setShowAddModal(false);
        setNewUser({ name: '', email: '', password: '', role: 'Quality Engineer' });
      } else {
        const errJson = await res.json();
        alert(`Failed to create user: ${errJson.detail || 'API Error'}`);
      }
    } catch (err) {
      console.error("User creation error:", err);
      alert('Failed to create user.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user from PostgreSQL?')) return;
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`/api/v1/admin/users/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setUsers(users.filter(u => u.id !== id));
      } else {
        const errJson = await res.json();
        alert(`Delete failed: ${errJson.detail || 'API Error'}`);
      }
    } catch (err) {
      console.error("Delete user error:", err);
      alert('Delete failed.');
    }
  };

  const filteredUsers = users.filter(u => 
    (u.full_name || u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (u.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout
      title="User Management"
      subtitle="VisionInspect AI Phase 8.1.4 — PostgreSQL User Accounts & Security Roles"
    >
      <div className="space-y-6">
        
        {/* Header Bar */}
        <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-[#2563EB]/10 rounded-xl text-[#2563EB]">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">System Users Directory</h2>
              <p className="text-xs text-gray-400">Total Registered Personnel: {users.length}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search user or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#1F2937] border border-gray-700 text-white text-xs rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-[#2563EB]"
              />
            </div>

            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center space-x-2 px-4 py-2.5 bg-[#2563EB] hover:bg-blue-600 text-xs font-bold text-white rounded-xl shadow-lg transition-all cursor-pointer shrink-0"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add User</span>
            </button>
          </div>
        </div>

        {/* User Table */}
        <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 shadow-xl space-y-4">
          {loading && (
            <div className="p-12 text-center text-gray-400 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 text-[#2563EB] animate-spin" />
              <p className="text-sm font-semibold">Loading users from PostgreSQL...</p>
            </div>
          )}

          {!loading && error && (
            <div className="p-8 text-center text-[#EF4444] space-y-2">
              <AlertTriangle className="w-8 h-8 mx-auto" />
              <p className="text-sm font-bold">{error}</p>
            </div>
          )}

          {!loading && !error && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-300">
                <thead className="bg-[#1F2937] text-gray-400 font-semibold uppercase text-[11px] border-b border-gray-800">
                  <tr>
                    <th className="px-4 py-3.5 rounded-l-xl">User Name</th>
                    <th className="px-4 py-3.5">Email Address</th>
                    <th className="px-4 py-3.5">System Role</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5">Created Date</th>
                    <th className="px-4 py-3.5 rounded-r-xl text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1F2937]">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-4 py-8 text-center text-gray-400">
                        No users available in database.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-[#1F2937]/50 transition-colors">
                        <td className="px-4 py-3.5 font-semibold text-white">{u.full_name || u.name}</td>
                        <td className="px-4 py-3.5 text-gray-400 font-mono">{u.email}</td>
                        <td className="px-4 py-3.5">
                          <span className="px-2.5 py-1 bg-[#1F2937] text-gray-200 border border-gray-700 rounded-lg text-[11px] font-semibold">
                            {u.role_name || u.role}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                            (u.status || 'Active').toLowerCase() === 'active'
                              ? 'bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/30'
                              : 'bg-gray-700/50 text-gray-400 border border-gray-600'
                          }`}>
                            {u.status || 'Active'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-gray-400 font-mono text-[11px]">{u.created_at ? u.created_at.substring(0, 10) : '2026-08-13'}</td>
                        <td className="px-4 py-3.5 text-right space-x-2">
                          <button 
                            onClick={() => handleDeleteUser(u.id)}
                            className="p-1.5 bg-[#1F2937] hover:bg-[#EF4444]/20 text-[#EF4444] rounded-lg transition-colors cursor-pointer"
                            title="Delete User Account"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Add User Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 w-full max-w-md space-y-5 shadow-2xl">
              <h3 className="text-lg font-bold text-white">Add New System User</h3>
              <form onSubmit={handleAddUser} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    className="w-full bg-[#1F2937] border border-gray-700 text-white text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#2563EB]"
                    placeholder="e.g. Alex Morgan"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">Work Email</label>
                  <input
                    type="email"
                    required
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    className="w-full bg-[#1F2937] border border-gray-700 text-white text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#2563EB]"
                    placeholder="alex@factory.ai"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">Password</label>
                  <input
                    type="password"
                    required
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className="w-full bg-[#1F2937] border border-gray-700 text-white text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#2563EB]"
                    placeholder="Password"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">System Role</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    className="w-full bg-[#1F2937] border border-gray-700 text-white text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#2563EB]"
                  >
                    <option value="Admin">Admin</option>
                    <option value="Factory Supervisor">Factory Supervisor</option>
                    <option value="Quality Engineer">Quality Engineer</option>
                  </select>
                </div>
                <div className="flex justify-end space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 bg-[#1F2937] hover:bg-gray-700 text-gray-300 text-xs font-semibold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 bg-[#2563EB] hover:bg-blue-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md"
                  >
                    {submitting ? 'Creating...' : 'Create Account'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
