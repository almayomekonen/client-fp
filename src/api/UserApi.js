import { API_BASE_URL } from "./config";

export async function fetchUsersFromServer() {
  const res = await fetch(`${API_BASE_URL}/api/users`, {
    credentials: "include",
  });
  const data = await res.json();
  return data;
}

export async function deleteUserFromServer(userId) {
  const res = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
    method: "DELETE",
    credentials: "include",
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.message || "שגיאה במחיקת משתמש");
  }
}

export const updateUserOnServer = async (userId, updateFields) => {
  const res = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(updateFields),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "שגיאה בעדכון משתמש");
  return data;
};

export async function login(username, password) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();
    if (!res.ok) return { success: false, message: data.message };
    return { success: true, user: data.user };
  } catch (err) {
    return { success: false, message: "שגיאה בהתחברות לשרת" };
  }
}

export async function logout(setCurrentUser) {
  try {
    await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
    });

    setCurrentUser(null);
    localStorage.removeItem("currentUser");
  } catch (err) {
    console.error("שגיאה בעת התנתקות:", err);

    setCurrentUser(null);
    localStorage.removeItem("currentUser");
  }
}

export async function checkAuth() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
      method: "GET",
      credentials: "include",
    });

    if (res.ok) {
      const data = await res.json();
      return { success: true, user: data.user };
    }
    return { success: false };
  } catch (err) {
    console.error("Auth check error:", err);
    return { success: false };
  }
}
