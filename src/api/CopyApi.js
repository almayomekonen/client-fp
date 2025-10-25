import { API_BASE_URL } from "./config";
import { fetchWithRoleCheck } from "./fetchWithRoleCheck";

export const createCopyOnServer = async ({
  statementId,
  groupId,
  experimentId,
  coderId,
}) => {
  if (!coderId) {
    return { success: false, message: "Please fill all required fields" };
  }

  const res = await fetchWithRoleCheck(`${API_BASE_URL}/api/copies`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ statementId, groupId, experimentId, coderId }),
  });

  if (!res.ok) throw new Error("Error creating copy");
  const newCopy = await res.json();

  return { success: true, message: "Copy added successfully", newCopy };
};

export const fetchCopiesFromServer = async () => {
  const res = await fetchWithRoleCheck(`${API_BASE_URL}/api/copies`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Error fetching copies");
  return await res.json();
};

export const deleteCopyFromServer = async (copyId) => {
  const res = await fetchWithRoleCheck(`${API_BASE_URL}/api/copies/${copyId}`, {
    method: "DELETE",
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error("Error deleting copy");
  }

  return await res.json();
};

export const UpdateCopyOnServer = async (copyId, updateFields) => {
  const res = await fetchWithRoleCheck(`${API_BASE_URL}/api/copies/${copyId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(updateFields),
  });

  if (!res.ok) throw new Error("Error updating copy");
  return await res.json();
};

export const fetchColorsFromServer = async () => {
  const res = await fetchWithRoleCheck(`${API_BASE_URL}/api/colors`, {
    method: "GET",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Error fetching colors");
  return await res.json();
};
