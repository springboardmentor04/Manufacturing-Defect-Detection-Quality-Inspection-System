import React, { useEffect, useState } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import api from "../../api/axios";

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchUsers = () => {
    setLoading(true);
    api
      .get("/api/users")
      .then((res) => setUsers(res.data))
      .catch((err) => setError(err.response?.data?.detail || "Failed to load users"))
      .finally(() => setLoading(false));
  };

  useEffect(fetchUsers, []);

  const handleRoleChange = async (userId, role) => {
    await api.patch(`/api/users/${userId}/role`, { role });
    fetchUsers();
  };

  const handleStatusToggle = async (userId, isActive) => {
    await api.patch(`/api/users/${userId}/status`, { is_active: !isActive });
    fetchUsers();
  };

  const handleDelete = async (userId) => {
    if (!window.confirm("Delete this user account? This cannot be undone.")) return;
    await api.delete(`/api/users/${userId}`);
    fetchUsers();
  };

  return (
    <DashboardLayout>
      <h2 className="text-xl font-bold text-slate-800 mb-1">User Management</h2>
      <p className="text-slate-500 text-sm mb-6">
        Manage quality engineer and factory supervisor accounts.
      </p>

      {error && <div className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-2 mb-4">{error}</div>}

      {loading ? (
        <p className="text-slate-500">Loading...</p>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-100 bg-slate-50">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{u.full_name}</td>
                  <td className="px-4 py-3 text-slate-600">{u.email}</td>
                  <td className="px-4 py-3">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      className="rounded-lg border border-slate-300 px-2 py-1 text-xs bg-white"
                    >
                      <option value="quality_engineer">Quality Engineer</option>
                      <option value="factory_supervisor">Factory Supervisor</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleStatusToggle(u.id, u.is_active)}
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        u.is_active ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {u.is_active ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(u.id)}
                      className="text-xs font-medium text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardLayout>
  );
}
