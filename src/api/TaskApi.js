import { createCopyOnServer } from "./CopyApi";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

export const addTaskForCopy = async ({
  experimentId,
  groupId,
  statementId,
  investigatorId,
  coderId,
}) => {
  try {
    // יצירת עותק חדש לוקאלי (ואולי גם שליחה לשרת אם זה חלק מהזרימה שלך)
    const r = await createCopyOnServer({
      statementId,
      groupId,
      experimentId,
      coderId,
    });
    const copyForTaskId = r.newCopy._id;
    // יצירת משימה חדשה מול השרת
    const response = await fetch(`${API_BASE_URL}/api/tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        experimentId,
        copiesId: [copyForTaskId],
        investigatorId,
        coderId,
      }),
    });

    if (!response.ok) throw new Error("שגיאה ביצירת משימה");

    return {
      success: true,
      message: "המשימה התווספה בהצלחה",
    };
  } catch (err) {
    console.error("שגיאה בהוספת משימה לעותק:", err);
    return {
      success: false,
      message: "שגיאה בהוספת משימה",
    };
  }
};

export const createTaskOnServer = async ({
  experimentId,
  copiesId,
  investigatorId,
  coderId,
}) => {
  const res = await fetch(`${API_BASE_URL}/api/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ experimentId, copiesId, investigatorId, coderId }),
  });
  if (!res.ok) throw new Error("שגיאה ביצירת משימה");
  return await res.json();
};

export const fetchTasksFromServer = async () => {
  const res = await fetch(`${API_BASE_URL}/api/tasks`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("שגיאה בקבלת משימות");
  return await res.json();
};

export const deleteTaskFromServer = async (taskId) => {
  const res = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error("שגיאה במחיקת משימה");
  return await res.json();
};

export const updateTaskOnServer = async (taskId, updateFields) => {
  const res = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(updateFields),
  });

  if (!res.ok) throw new Error("שגיאה בעדכון המשימה");
  return await res.json();
};
