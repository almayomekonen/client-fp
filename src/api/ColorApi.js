import { API_BASE_URL } from "./config";
import { fetchWithRoleCheck } from "./fetchWithRoleCheck";

export const fetchColorsFromServer = async () => {
  const res = await fetchWithRoleCheck(`${API_BASE_URL}/api/colors`, {
    method: "GET",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Error fetching colors");
  return await res.json();
};

export const createColorOnServer = async (code, name) => {
  const res = await fetchWithRoleCheck(`${API_BASE_URL}/api/colors`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ code, name }),
  });
  if (!res.ok) throw new Error("Error adding color");
  return await res.json();
};

export const deleteColorFromServer = async (colorId) => {
  const res = await fetchWithRoleCheck(
    `${API_BASE_URL}/api/colors/${colorId}`,
    {
      method: "DELETE",
      credentials: "include",
    }
  );
  if (!res.ok) throw new Error("Error deleting color");
  return await res.json();
};
