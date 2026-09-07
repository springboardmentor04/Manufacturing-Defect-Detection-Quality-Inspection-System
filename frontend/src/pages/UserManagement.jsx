import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Users,
  UserRound,
  ShieldCheck,
  X,
} from "lucide-react";

import SidebarSupervisor from "../components/SidebarSupervisor";
import Navbar from "../components/Navbar";
import api from "../utils/api";
import "../styles/UserManagement.css";

const ROLES = [
  "Quality Engineer",
  "Factory Supervisor",
];

const emptyForm = {
  name: "",
  email: "",
  password: "",
  role: "Quality Engineer",
};

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const loadUsers = useCallback(async (silent = false) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const response = await api.get("/users");
      const data = response.data;

      // Support both backend contracts:
      // 1) { users: [...] }
      // 2) [...]
      const records = Array.isArray(data)
        ? data
        : Array.isArray(data?.users)
          ? data.users
          : Array.isArray(data?.data)
            ? data.data
            : null;

      if (!records) {
        throw new Error(
          "Users API response does not contain user records."
        );
      }

      setUsers(records);
    } catch (err) {
      console.error("User Management:", err);

      const detail = err?.response?.data?.detail;

      setUsers([]);
      setError(
        typeof detail === "string"
          ? detail
          : err?.response?.data?.message ||
              err?.message ||
              "Unable to load users from the backend."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);


  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      void loadUsers();
    }, 0);

    return () => window.clearTimeout(initialLoad);
  }, [loadUsers]);

  const qualityEngineerCount = users.filter(
    (user) => user.role === "Quality Engineer"
  ).length;

  const supervisorCount = users.filter(
    (user) => user.role === "Factory Supervisor"
  ).length;

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return users;

    return users.filter((user) =>
      [
        user.id,
        user.name,
        user.email,
        user.role,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [users, search]);

  const openAddModal = () => {
    setEditingUser(null);
    setForm(emptyForm);
    setFormError("");
    setModalOpen(true);
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setForm({
      name: user.name || "",
      email: user.email || "",
      password: "",
      role: user.role || "Quality Engineer",
    });
    setFormError("");
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;

    setModalOpen(false);
    setEditingUser(null);
    setForm(emptyForm);
    setFormError("");
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const saveUser = async (event) => {
    event.preventDefault();
    setFormError("");

    if (!form.name.trim()) {
      setFormError("Name is required.");
      return;
    }

    if (!form.email.trim()) {
      setFormError("Email is required.");
      return;
    }

    if (!editingUser && !form.password) {
      setFormError("Password is required for a new user.");
      return;
    }

    setSaving(true);

    try {
      const isEditing = Boolean(editingUser);

      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role,
      };

      if (form.password.trim()) {
        payload.password = form.password;
      }

      const response = isEditing
        ? await api.put(
            `/users/${encodeURIComponent(editingUser.id)}`,
            payload
          )
        : await api.post("/users", payload);

      const data = response.data;

      if (data?.success === false) {
        throw new Error(
          data?.message ||
            `Unable to ${isEditing ? "update" : "create"} user.`
        );
      }

      closeModal();
      await loadUsers();
    } catch (err) {
      console.error("Save user:", err);
      setFormError(
        err?.message || "Unable to save user."
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteUser = async (user) => {
    const confirmed = window.confirm(
      `Delete ${user.name}? This will permanently remove the user account.`
    );

    if (!confirmed) return;

    setError("");

    try {
      const response = await api.delete(
        `/users/${encodeURIComponent(user.id)}`
      );

      const data = response.data;

      if (data?.success === false) {
        throw new Error(
          data?.message || "Unable to delete user."
        );
      }

      await loadUsers();
    } catch (err) {
      console.error("Delete user:", err);

      const detail = err?.response?.data?.detail;
      setError(
        typeof detail === "string"
          ? detail
          : err?.response?.data?.message ||
              err?.message ||
              "Unable to delete user."
      );
    }
  };

  const getInitial = (name) =>
    name?.trim()?.charAt(0)?.toUpperCase() || "?";

  return (
    <>
      <SidebarSupervisor />

      <div className="dashboard">
        <Navbar title="User Management" />

        <main className="user-management-container">

          <header className="user-page-header">
            <div>
              <span className="section-label">
                ADMINISTRATION
              </span>

              <h2>User Management</h2>

              <p>
                Manage registered personnel and system
                access using real user records.
              </p>
            </div>

            <div className="user-header-actions">
              <div className="user-count-badge">
                <span className="user-count-dot" />
                {users.length}{" "}
                {users.length === 1 ? "USER" : "USERS"}
              </div>

              <button
                className="refresh-users-btn"
                onClick={loadUsers}
                disabled={loading || refreshing}
                title="Refresh users"
                aria-label="Refresh users"
              >
                <RefreshCw
                  size={14}
                  className={loading || refreshing ? "spin" : ""}
                />
              </button>
            </div>
          </header>

          {error && (
            <div className="user-error-banner">
              <AlertTriangle size={17} />
              <span>{error}</span>
              <button onClick={loadUsers}>
                Retry
              </button>
            </div>
          )}

          <section className="user-summary">

            <div className="user-summary-card">
              <div className="summary-icon">
                <Users size={18} />
              </div>

              <div>
                <h3>Total Users</h3>
                <h2>{users.length}</h2>
                <span>Registered accounts</span>
              </div>
            </div>

            <div className="user-summary-card quality-users-card">
              <div className="summary-icon">
                <Users size={18} />
              </div>

              <div>
                <h3>Quality Engineers</h3>
                <h2>{qualityEngineerCount}</h2>
                <span>Assigned role</span>
              </div>
            </div>

            <div className="user-summary-card supervisor-users-card">
              <div className="summary-icon">
                <Users size={18} />
              </div>

              <div>
                <h3>Factory Supervisors</h3>
                <h2>{supervisorCount}</h2>
                <span>Assigned role</span>
              </div>
            </div>

          </section>

          <section className="user-actions">

            <div className="user-search">
              <Search size={16} />

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search name, email, role or ID..."
                aria-label="Search users"
              />
              {search && (
                <button
                  className="clear-user-search"
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Clear user search"
                  title="Clear search"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <div className="user-action-meta">
              <span>
                {search
                  ? `${filteredUsers.length} matching ${filteredUsers.length === 1 ? "account" : "accounts"}`
                  : "Live personnel directory"}
              </span>
            </div>

            <button
              className="add-user-btn"
              onClick={openAddModal}
            >
              <Plus size={16} />
              Add User
            </button>

          </section>

          <section className="user-table-card">

            <div className="user-table-header">
              <div>
                <span className="section-label">
                  PERSONNEL
                </span>

                <h2>Registered Users</h2>
              </div>

              <span className="table-count">
                {filteredUsers.length}{" "}
                {filteredUsers.length === 1
                  ? "ACCOUNT"
                  : "ACCOUNTS"}
              </span>
            </div>

            {loading ? (
              <div className="user-empty-state">
                <div className="user-spinner" />
                <strong>Loading users</strong>
                <span>
                  Retrieving real accounts from the backend.
                </span>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="user-empty-state">
                <Users size={24} />
                <strong>
                  {search
                    ? "No matching users"
                    : "No users found"}
                </strong>
                <span>
                  {search
                    ? "Try another search term."
                    : "There are no user records available in the database."}
                </span>
              </div>
            ) : (
              <div className="user-table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>User ID</th>
                      <th>Name</th>
                      <th>Role</th>
                      <th>Email</th>
                      <th>Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr key={user.id}>

                        <td>
                          <span className="employee-id">
                            {user.id}
                          </span>
                        </td>

                        <td>
                          <div className="user-name">
                            <span className="user-avatar">
                              {getInitial(user.name)}
                            </span>

                            <span>{user.name}</span>
                          </div>
                        </td>

                        <td>
                          <span
                            className={`role-badge ${
                              user.role === "Factory Supervisor"
                                ? "role-supervisor"
                                : "role-engineer"
                            }`}
                          >
                            {user.role === "Factory Supervisor" ? (
                              <ShieldCheck size={12} />
                            ) : (
                              <UserRound size={12} />
                            )}
                            {user.role || "—"}
                          </span>
                        </td>

                        <td>
                          <span className="user-email">
                            {user.email}
                          </span>
                        </td>

                        <td>
                          <div className="user-actions-buttons">

                            <button
                              className="edit-btn"
                              onClick={() =>
                                openEditModal(user)
                              }
                            >
                              <Pencil size={13} />
                              Edit
                            </button>

                            <button
                              className="delete-btn"
                              onClick={() =>
                                deleteUser(user)
                              }
                            >
                              <Trash2 size={13} />
                              Delete
                            </button>

                          </div>
                        </td>

                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!loading && filteredUsers.length > 0 && (
              <div className="user-table-footer">
                <span>
                  <span className="footer-dot" />
                  Showing {filteredUsers.length} of {users.length} registered accounts
                </span>
                <span>Changes sync with the backend after save or delete.</span>
              </div>
            )}

          </section>

        </main>
      </div>

      {modalOpen && (
        <div
          className="user-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget
            ) {
              closeModal();
            }
          }}
        >
          <div
            className="user-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-modal-title"
          >

            <div className="user-modal-header">
              <div>
                <span className="section-label">
                  {editingUser
                    ? "EDIT ACCOUNT"
                    : "NEW ACCOUNT"}
                </span>

                <h2 id="user-modal-title">
                  {editingUser
                    ? "Edit User"
                    : "Add User"}
                </h2>
              </div>

              <button
                className="modal-close-btn"
                onClick={closeModal}
                disabled={saving}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div className="user-form-error">
                <AlertTriangle size={15} />
                {formError}
              </div>
            )}

            <form
              className="user-form"
              onSubmit={saveUser}
            >
              <label>
                <span>Name</span>

                <input
                  name="name"
                  value={form.name}
                  onChange={handleFormChange}
                  placeholder="Full name"
                  autoComplete="name"
                />
              </label>

              <label>
                <span>Email</span>

                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleFormChange}
                  placeholder="name@example.com"
                  autoComplete="email"
                />
              </label>

              <label>
                <span>
                  Password{" "}
                  {editingUser && (
                    <small>
                      Leave blank to keep current password
                    </small>
                  )}
                </span>

                <input
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={handleFormChange}
                  placeholder={
                    editingUser
                      ? "Optional"
                      : "Password"
                  }
                  autoComplete={
                    editingUser
                      ? "new-password"
                      : "new-password"
                  }
                />
              </label>

              <label>
                <span>Role</span>

                <select
                  name="role"
                  value={form.role}
                  onChange={handleFormChange}
                >
                  {ROLES.map((role) => (
                    <option
                      value={role}
                      key={role}
                    >
                      {role}
                    </option>
                  ))}
                </select>
              </label>

              <div className="user-form-actions">
                <button
                  type="button"
                  className="cancel-user-btn"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="save-user-btn"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <RefreshCw
                        size={14}
                        className="spin"
                      />
                      Saving...
                    </>
                  ) : editingUser ? (
                    <>
                      <Pencil size={14} />
                      Save Changes
                    </>
                  ) : (
                    <>
                      <Plus size={14} />
                      Create User
                    </>
                  )}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
    </>
  );
}

export default UserManagement;