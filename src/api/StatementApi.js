import { fetchWithRoleCheck } from "./fetchWithRoleCheck";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

export const createStatementOnServer = async ({
  name,
  text,
  groupId,
  experimentId,
}) => {
  if (!name || !text) {
    return { success: false, message: "Please fill in all required fields" };
  }

  const slateText = [
    {
      type: "paragraph",
      children: [{ text }],
    },
  ];

  const res = await fetchWithRoleCheck(`${API_BASE_URL}/api/statements`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ name, slateText, groupId, experimentId }),
  });

  if (!res.ok) throw new Error("Error creating statement");
  return await res.json();
};

export const deleteStatementFromServer = async (id) => {
  const res = await fetchWithRoleCheck(`${API_BASE_URL}/api/statements/${id}`, {
    method: "DELETE",
    credentials: "include",
  });

  if (!res.ok) throw new Error("Error deleting statement");
  return await res.json();
};

export const fetchStatementsFromServer = async () => {
  const res = await fetchWithRoleCheck(`${API_BASE_URL}/api/statements`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Error getting statements");
  return await res.json();
};

export const fetchStatementsByGroupId = async (groupId) => {
  const res = await fetchWithRoleCheck(
    `${API_BASE_URL}/api/statements/group/${groupId}`,
    {
      credentials: "include",
    }
  );
  if (!res.ok) throw new Error("Error getting statements by group");
  return await res.json();
};

export const fetchStatementById = async (statementId) => {
  const res = await fetchWithRoleCheck(
    `${API_BASE_URL}/api/statements/${statementId}`,
    {
      credentials: "include",
    }
  );
  if (!res.ok) throw new Error("Error getting statement");
  return await res.json();
};

export const fetchStatementsByExperimentId = async (experimentId) => {
  const res = await fetchWithRoleCheck(
    `${API_BASE_URL}/api/statements/experiment/${experimentId}`,
    {
      credentials: "include",
    }
  );
  if (!res.ok) throw new Error("Error getting statements by experiment");
  return await res.json();
};
