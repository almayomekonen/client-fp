import { API_BASE_URL } from "./config";

export const fetchWithRoleCheck = async (url, options = {}) => {
  return fetch(url, options);
};

export const apiCall = async (endpoint, options = {}) => {
  const url = endpoint.startsWith("http")
    ? endpoint
    : `${API_BASE_URL}${endpoint}`;
  return fetchWithRoleCheck(url, {
    credentials: "include",
    ...options,
  });
};
