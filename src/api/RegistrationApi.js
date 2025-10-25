import { API_BASE_URL } from "./config";
import { fetchWithRoleCheck } from "./fetchWithRoleCheck";

export async function register(
  username,
  password,
  confirmPassword,
  role,
  email
) {
  if (!username || !password || !confirmPassword || !role || !email) {
    return { success: false, message: "נא למלא את כל השדות" };
  }

  if (password !== confirmPassword) {
    return { success: false, message: "הסיסמאות אינן תואמות" };
  }

  try {
    const res = await fetchWithRoleCheck(`${API_BASE_URL}/api/registration`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ username, password, role, email }),
    });

    const data = await res.json();
    if (!res.ok) return { success: false, message: data.message };

    return { success: true, message: data.message };
  } catch (err) {
    return { success: false, message: "Error connecting to server" };
  }
}

export async function approveRegistration(id) {
  await fetchWithRoleCheck(`${API_BASE_URL}/api/registration/${id}/approve`, {
    method: "POST",
    credentials: "include",
  });
}

export async function rejectRegistration(id) {
  await fetchWithRoleCheck(`${API_BASE_URL}/api/registration/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
}

export async function fetchRegistrationRequests() {
  try {
    const res = await fetchWithRoleCheck(`${API_BASE_URL}/api/registration`, {
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Server error");
    return data;
  } catch (err) {
    console.error(err);
    return [];
  }
}
