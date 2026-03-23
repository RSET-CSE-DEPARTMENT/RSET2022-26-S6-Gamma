import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./DatabaseAdmin.css";
import { createAdminApiCaller } from "./databaseAdminApi";

export default function DatabaseAdminUsers() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token") || "";
  const callAdminApi = useMemo(() => createAdminApiCaller(token), [token]);

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const roleOptions = useMemo(
    () => ["candidate", "recruiter", "admin", "database_admin"],
    []
  );

  const refreshUsers = useCallback(async () => {
    const data = await callAdminApi({ action: "list_users" });
    setUsers(data.users || []);
  }, [callAdminApi]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        await refreshUsers();
      } catch (error) {
        alert(error.message);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [refreshUsers]);

  const handleRoleChange = async (userId, role) => {
    try {
      await callAdminApi({ action: "set_user_role", userId, role });
      await refreshUsers();
      alert("Role updated");
    } catch (error) {
      alert(error.message);
    }
  };

  const handleResetPassword = async (userId) => {
    const newPassword = prompt("Enter new password (min 6 chars):");
    if (!newPassword) return;
    try {
      await callAdminApi({ action: "set_user_password", userId, newPassword });
      alert("Password updated");
    } catch (error) {
      alert(error.message);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm(`Delete user ID ${userId}? This is permanent.`)) return;
    try {
      await callAdminApi({ action: "delete_user", userId });
      await refreshUsers();
      alert("User deleted");
    } catch (error) {
      alert(error.message);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  return (
    <div className="dbadmin-page">
      <header className="dbadmin-header">
        <h1>Database Admin Control Panel</h1>
        <button className="dbadmin-btn dbadmin-btn-danger" onClick={handleLogout}>Logout</button>
      </header>

      <nav className="dbadmin-nav">
        <button className="dbadmin-tab dbadmin-tab-active" onClick={() => navigate("/database-admin/users")}>
          User Authorization
        </button>
        <button className="dbadmin-tab" onClick={() => navigate("/database-admin/records")}>
          Database Records
        </button>
      </nav>

      {loading && <p className="dbadmin-loading">Loading...</p>}

      <section className="dbadmin-card">
        <h2>User Authorization Management</h2>
        <p>Set roles, reset passwords, and delete accounts.</p>
        <div className="dbadmin-users-wrap">
          <table className="dbadmin-users-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Email</th>
                <th>Role</th>
                <th>Name</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.id}</td>
                  <td className="dbadmin-wrap-cell">{user.email}</td>
                  <td>
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(Number(user.id), e.target.value)}
                    >
                      {roleOptions.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="dbadmin-wrap-cell">{`${user.first_name || ""} ${user.last_name || ""}`.trim()}</td>
                  <td className="dbadmin-actions-cell">
                    <button className="dbadmin-btn" onClick={() => handleResetPassword(Number(user.id))}>Reset Password</button>
                    <button
                      className="dbadmin-btn dbadmin-btn-danger"
                      onClick={() => handleDeleteUser(Number(user.id))}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

