import { API_BASE_URL } from "./config";

export const createCopyOnServer = async ({
  statementId,
  groupId,
  experimentId,
  coderId,
}) => {
  if (!coderId) {
    return { success: false, message: "נא למלא את כל שדות החובה" };
  }

  const res = await fetch(`${API_BASE_URL}/api/copies`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ statementId, groupId, experimentId, coderId }),
  });

  if (!res.ok) throw new Error("שגיאה ביצירת עותק");
  const newCopy = await res.json();

  return { success: true, message: "ההעתק התווסף בהצלחה", newCopy };
};

export const fetchCopiesFromServer = async () => {
  const res = await fetch(`${API_BASE_URL}/api/copies`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("שגיאה בקבלת עותקים");
  return await res.json();
};

export const deleteCopyFromServer = async (copyId) => {
  const res = await fetch(`${API_BASE_URL}/api/copies/${copyId}`, {
    method: "DELETE",
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error("שגיאה במחיקת עותק");
  }

  return await res.json();
};

export const UpdateCopyOnServer = async (copyId, updateFields) => {
  const res = await fetch(`${API_BASE_URL}/api/copies/${copyId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(updateFields),
  });

  if (!res.ok) throw new Error("שגיאה בעדכון העתק");
  return await res.json();
};

export const fetchColorsFromServer = async () => {
  const res = await fetch(`${API_BASE_URL}/api/colors`, {
    method: "GET",
    credentials: "include", // ← הוסף
  });
  if (!res.ok) throw new Error("שגיאה בקבלת צבעים");
  return await res.json();
};
