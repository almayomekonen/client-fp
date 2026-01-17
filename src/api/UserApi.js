import { API_BASE_URL } from "./config";
import { fetchWithRoleCheck } from "./fetchWithRoleCheck";

export async function fetchUsersFromServer() {
  try {
    const res = await fetchWithRoleCheck(`${API_BASE_URL}/api/users`, {
      credentials: "include",
    });

    if (!res.ok) {
      const errorData = await res
        .json()
        .catch(() => ({ message: "Unknown error" }));
      throw new Error(errorData.message || `Server error: ${res.status}`);
    }

    const data = await res.json();
    return data;
  } catch (err) {
    console.error("❌ Error fetching users:", err);
    throw err;
  }
}

export async function deleteUserFromServer(userId) {
  try {
    const res = await fetchWithRoleCheck(
      `${API_BASE_URL}/api/users/${userId}`,
      {
        method: "DELETE",
        credentials: "include",
      }
    );

    if (!res.ok) {
      const data = await res.json().catch(() => ({ message: "Unknown error" }));
      throw new Error(data.message || "Error deleting user");
    }

    const data = await res.json();
    return data;
  } catch (err) {
    console.error("Error deleting user:", err);
    throw err;
  }
}

export const updateUserOnServer = async (userId, updateFields) => {
  const res = await fetchWithRoleCheck(`${API_BASE_URL}/api/users/${userId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(updateFields),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Error updating user");
  return data;
};

export const resetPasswordOnServer = async (userId, newPassword) => {
  const res = await fetch(`${API_BASE_URL}/api/users/${userId}/reset-password`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ newPassword }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Error resetting password");
  return data;
};

export const checkUsernameExists = async (username) => {
  const res = await fetch(`${API_BASE_URL}/api/users/check-username/${username}`);
  const data = await res.json();
  return data; // { exists: true/false, userId: '...', email: '...' }
};

export async function login(username, password) {
  try {
    const res = await fetchWithRoleCheck(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include", // ← Make sure this exists!
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();
    if (!res.ok) return { success: false, message: data.message };

    return { success: true, user: data.user };
  } catch (err) {
    console.error("❌ Login error:", err);
    return { success: false, message: "Error connecting to server" };
  }
}

export async function logout(setCurrentUser, navigate) {
  try {
    await fetchWithRoleCheck(`${API_BASE_URL}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
    });

    setCurrentUser(null);
    localStorage.removeItem("currentUser");

    document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie =
      "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=" +
      window.location.hostname +
      ";";

    if (navigate) {
      navigate("/", { replace: true });
    }
  } catch (err) {
    console.error("Error during logout:", err);

    // Even on error, clear everything
    setCurrentUser(null);
    localStorage.removeItem("currentUser");
    document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie =
      "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=" +
      window.location.hostname +
      ";";

    if (navigate) { 
      navigate("/", { replace: true });
    }
  }
}

export async function checkAuth() {
  try {
    const res = await fetchWithRoleCheck(`${API_BASE_URL}/api/auth/me`, {
      method: "GET",
      credentials: "include",
    });

    if (res.ok) {
      const data = await res.json();
      return { success: true, user: data.user };
    }

    return { success: false };
  } catch (err) {
    console.error("💥 Auth check error:", err);
    return { success: false };
  }
}
