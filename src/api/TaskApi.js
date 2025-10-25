import { API_BASE_URL } from "./config";
import { createCopyOnServer } from "./CopyApi";
import { fetchWithRoleCheck } from "./fetchWithRoleCheck";

export const addTaskForCopy = async ({
  experimentId,
  groupId,
  statementId,
  investigatorId,
  coderId,
}) => {
  try {
    const r = await createCopyOnServer({
      statementId,
      groupId,
      experimentId,
      coderId,
    });
    const copyForTaskId = r.newCopy._id;

    const response = await fetchWithRoleCheck(`${API_BASE_URL}/api/tasks`, {
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

    if (!response.ok) throw new Error("Error creating task");

    return {
      success: true,
      message: "Task added successfully",
    };
  } catch (err) {
    console.error("Error adding task for copy:", err);
    return {
      success: false,
      message: "Error adding task",
    };
  }
};

export const createTaskOnServer = async ({
  experimentId,
  copiesId,
  investigatorId,
  coderId,
}) => {
  const res = await fetchWithRoleCheck(`${API_BASE_URL}/api/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ experimentId, copiesId, investigatorId, coderId }),
  });
  if (!res.ok) throw new Error("Error creating task");
  return await res.json();
};

export const fetchTasksFromServer = async () => {
  const res = await fetchWithRoleCheck(`${API_BASE_URL}/api/tasks`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Error fetching tasks");
  return await res.json();
};

export const deleteTaskFromServer = async (taskId) => {
  const res = await fetchWithRoleCheck(`${API_BASE_URL}/api/tasks/${taskId}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) {
    const errorData = await res
      .json()
      .catch(() => ({ message: "Unknown error" }));
    console.error("Delete task failed:", res.status, errorData);
    throw new Error(errorData.message || "Error deleting task");
  }
  return await res.json();
};

export const updateTaskOnServer = async (taskId, updateFields) => {
  const res = await fetchWithRoleCheck(`${API_BASE_URL}/api/tasks/${taskId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(updateFields),
  });

  if (!res.ok) throw new Error("Error updating task");
  return await res.json();
};
