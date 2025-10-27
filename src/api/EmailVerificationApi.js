import { API_BASE_URL } from "./config";
import { fetchWithRoleCheck } from "./fetchWithRoleCheck";

export async function sendVerificationCode(email) {
  if (!email) {
    return { success: false, message: "Please enter email" };
  }

  try {
    const res = await fetchWithRoleCheck(
      `${API_BASE_URL}/api/email-verification/send-code`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email }),
      }
    );

    const data = await res.json();

    if (!res.ok) return { success: false, message: data.message };

    return { success: true, message: data.message };
  } catch (err) {
    return { success: false, message: "Error sending verification code" };
  }
}

export async function verifyCode(email, code) {
  if (!email || !code) {
    return { success: false, message: "Please enter email and code" };
  }

  try {
    const res = await fetchWithRoleCheck(
      `${API_BASE_URL}/api/email-verification/verify-code`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, code }),
      }
    );

    const data = await res.json();
    if (!res.ok) return { success: false, message: data.message };

    return { success: true, message: data.message };
  } catch (err) {
    return { success: false, message: "Error verifying code" };
  }
}
