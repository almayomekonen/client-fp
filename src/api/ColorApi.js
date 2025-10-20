import { API_BASE_URL } from "./config";
import { fetchWithRoleCheck } from "./fetchWithRoleCheck";

export const fetchColorsFromServer = async () => {
  const res = await fetchWithRoleCheck(`${API_BASE_URL}/api/colors`, {
    method: "GET",
    credentials: "include",
  });
  if (!res.ok) throw new Error("שגיאה בקבלת צבעים");
  return await res.json();
};

export const addColorToServer = async (name, code) => {
  if (!name || !code) {
    return { success: false, message: "נא לבחור צבע" };
  }
  const res = await fetchWithRoleCheck(`${API_BASE_URL}/api/colors`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ name, code }),
  });
  if (!res.ok) throw new Error("שגיאה בהוספת צבע");
  return await res.json();
};

export const deleteColorFromServer = async (id) => {
  const res = await fetchWithRoleCheck(`${API_BASE_URL}/api/colors/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error("שגיאה במחיקת צבע");
  return await res.json();
};
