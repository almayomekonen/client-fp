import React, { useState, useEffect } from "react";

export default function UserListForDeletion({ users, onDelete, onUpdateRole }) {
  // Track role selections locally so we can reset if the user cancels
  const [roleSelections, setRoleSelections] = useState({});

  // Initialize role selections from users prop
  useEffect(() => {
    const initialRoles = {};
    users.forEach((user) => {
      initialRoles[user._id] = user.role;
    });
    setRoleSelections(initialRoles);
  }, [users]);

  const handleOnDelete = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this user?")) {
      return;
    }

    try {
      await onDelete(userId);
    } catch (err) {
      console.error("❌ Error deleting user:", err);
    }
  };

  const handleOnUpdateRole = async (userId, newRole) => {
    // Get user info for better confirmation message
    const user = users.find((u) => u._id === userId);
    const username = user ? user.username : "this user";
    const currentRole = user ? user.role : "";

    // Don't prompt if it's the same role
    if (currentRole === newRole) {
      return;
    }

    if (
      !window.confirm(
        `Are you sure you want to change ${username}'s role from "${currentRole}" to "${newRole}"?`
      )
    ) {
      // Reset the select to the current role if the user cancels
      setRoleSelections((prev) => ({ ...prev, [userId]: currentRole }));
      return;
    }

    try {
      await onUpdateRole(userId, newRole);
      setRoleSelections((prev) => ({ ...prev, [userId]: newRole }));
    } catch (err) {
      console.error("Error updating role:", err);
      alert(`Error updating role: ${err.message}`);
      // Reset to current role on error
      setRoleSelections((prev) => ({ ...prev, [userId]: currentRole }));
    }
  };

  const getRoleDisplayName = (role) => {
    if (role === "investigator") return "Researcher";
    if (role === "admin") return "Admin";
    if (role === "coder") return "Coder";
    return role;
  };

  return (
    <div>
      {users.map((user) => (
        <div
          key={user.username}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "8px",
            gap: "8px",
          }}
        >
          <span>
            {user.username} ({getRoleDisplayName(user.role)})
          </span>

          <div style={{ display: "flex", gap: "8px" }}>
            <select
              value={roleSelections[user._id] || user.role}
              onChange={(e) => handleOnUpdateRole(user._id, e.target.value)}
            >
              <option value="admin">Admin</option>
              <option value="investigator">Researcher</option>
              <option value="coder">Coder</option>
            </select>

            <button
              onClick={() => handleOnDelete(user._id)}
              style={{ backgroundColor: "red", color: "white" }}
            >
              Delete User
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
