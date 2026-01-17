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

    if (!res.ok) {
      // Return the exact server error message
      return { 
        success: false, 
        message: data.message || "Failed to send verification code" 
      };
    }

    return { success: true, message: data.message };
  } catch (err) {
    console.error("Email verification API error:", err);
    // More specific error message
    return { 
      success: false, 
      message: "Unable to send verification code. Please check your internet connection and try again." 
    };
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
    if (!res.ok) {
      // Return the exact server error message
      return { 
        success: false, 
        message: data.message || "Failed to verify code" 
      };
    }

    return { success: true, message: data.message };
  } catch (err) {
    console.error("Code verification API error:", err);
    // More specific error message
    return { 
      success: false, 
      message: "Unable to verify code. Please check your internet connection and try again." 
    };
  }
}
