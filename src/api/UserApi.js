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
    console.log("🔐 Attempting login for:", username);
    console.log("📡 API_BASE_URL:", API_BASE_URL);

    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include", // ← וודא שזה קיים!
      body: JSON.stringify({ username, password }),
    });

    console.log("📨 Response status:", res.status);
    console.log("🍪 Response headers:", res.headers);

    const data = await res.json();
    if (!res.ok) return { success: false, message: data.message };

    console.log("✅ Login successful, user:", data.user);

    return { success: true, user: data.user };
  } catch (err) {
    console.error("❌ Login error:", err);
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

    console.log("✅ Logged out successfully");
  } catch (err) {
    console.error("שגיאה בעת התנתקות:", err);

    setCurrentUser(null);
    localStorage.removeItem("currentUser");
  }
}

export async function checkAuth() {
  try {
    console.log("📡 Checking auth at:", `${API_BASE_URL}/api/auth/me`);
    console.log("🍪 Sending credentials: include");

    const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
      method: "GET",
      credentials: "include",
    });

    console.log("📨 Auth check response status:", res.status);

    if (res.ok) {
      const data = await res.json();
      console.log("✅ Auth successful, user:", data.user?.username);
      return { success: true, user: data.user };
    }

    console.log("❌ Auth check failed:", res.status);
    return { success: false };
  } catch (err) {
    console.error("💥 Auth check error:", err);
    return { success: false };
  }
}
