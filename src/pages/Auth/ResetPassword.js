import React, { useState } from "react";
import { useUsers } from "../../context/UserContext";
import { useEmailVerification } from "../../context/EmailVerificationContext";
import { useNavigate } from "react-router-dom";
import ResetPasswordForm from "../../components/Auth/ResetPasswordForm";
import { checkUsernameExists } from "../../api/UserApi";
import "../../styles/Auth.css";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const { resetPassword } = useUsers(); 
  const { sendVerificationCode, verifyCode } = useEmailVerification();

  const [username, setUsername] = useState("");
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [codeFromUser, setCodeFromUser] = useState("");
  const [step, setStep] = useState("enterUsername");

  const handleSendCode = async () => {
    if (!username) {
      setMessage("❌ Please enter username");
      return;
    }

    setMessage("🔍 Checking username...");
    
    try {
      const result = await checkUsernameExists(username);
      
      if (!result.exists) {
        setMessage("❌ Username does not exist");
        return;
      }

      setUserId(result.userId);
      setEmail(result.email);

      setMessage("📧 Sending verification code...");
      
      const verificationResult = await sendVerificationCode(result.email);
      
      if (verificationResult.success) {
        setMessage("✅ " + verificationResult.message);
        setStep("waitingForCode");
      } else {
        setMessage("❌ " + verificationResult.message);
      }
    } catch (err) {
      setMessage("❌ " + (err.message || "Error checking username"));
    }
  };

  const handleVerifyCode = async () => {
    if (!codeFromUser) {
      setMessage("❌ Please enter code");
      return;
    }

    // Show loading state
    setMessage("🔍 Verifying code...");
    
    const result = await verifyCode(email, codeFromUser);
    
    // Display the exact message from the API
    if (result.success) {
      setMessage(""); 
      setStep("verified");
    } else {
      // Check for specific error types
      if (
        result.message &&
        (result.message.toLowerCase().includes("not found") || 
         result.message.toLowerCase().includes("expired"))
      ) {
        setMessage("❌ Code expired or invalid. Please resend code.");
      } else {
        setMessage("❌ " + result.message);
      }
    }
  };

  const handleResendCode = async () => {
    setMessage("📧 Resending verification code...");
    const result = await sendVerificationCode(email);
    
    // Display the exact message from the API
    if (result.success) {
      setMessage("✅ " + result.message);
    } else {
      setMessage("❌ " + result.message);
    }
  };

  const handlePasswordReset = async (newPassword) => {
    if (!userId) {
      setMessage("❌ User not found");
      return;
    }

    setMessage("🔄 Resetting password...");
    
    try {
      const result = await resetPassword(userId, newPassword);
      if (result && result.message) {
        setMessage("✅ Password changed successfully! Redirecting to login...");
        setTimeout(() => navigate("/"), 2000);
      } else {
        setMessage("✅ Password changed successfully! Redirecting to login...");
        setTimeout(() => navigate("/"), 2000);
      }
    } catch (err) {
      setMessage("❌ " + (err.message || "Error resetting password"));
    }
  };

  // Determine message type based on content
  const getMessageType = (msg) => {
    if (!msg) return "";
    
    // Error messages (red)
    if (msg.includes("❌") || 
        msg.toLowerCase().includes("error") ||
        msg.toLowerCase().includes("failed") ||
        msg.toLowerCase().includes("invalid") ||
        msg.toLowerCase().includes("expired") ||
        msg.toLowerCase().includes("not found") ||
        msg.toLowerCase().includes("not exist")) {
      return "error";
    }
    
    // Success messages (green)
    if (msg.includes("✅") ||
        msg.toLowerCase().includes("success") ||
        msg.toLowerCase().includes("sent to email") ||
        msg.toLowerCase().includes("code sent") ||
        msg.toLowerCase().includes("changed")) {
      return "success";
    }
    
    // Info/loading messages (blue)
    return "info";
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">🔑</div>
          <h1 className="auth-title">Reset Password</h1>
          <p className="auth-subtitle">Reset your password</p>
        </div>

        {message && step !== "verified" && (
          <div className={`auth-message ${getMessageType(message)}`}>
            {message}
          </div>
        )}

        {step === "enterUsername" && (
          <div className="auth-form">
            <div className="auth-form-group">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                className="auth-input"
                required
              />
            </div>
            <button onClick={handleSendCode} className="auth-btn">
              Send code to email
            </button>
          </div>
        )}

        {step === "waitingForCode" && (
          <div className="auth-form">
            <div className="auth-form-group">
              <input
                type="text"
                value={codeFromUser}
                onChange={(e) => setCodeFromUser(e.target.value)}
                placeholder="Verification Code"
                className="auth-input"
                required
              />
            </div>
            <button onClick={handleVerifyCode} className="auth-btn">
              Verify Code
            </button>
            <div style={{ marginTop: "10px", textAlign: "center" }}>
              <span
                onClick={handleResendCode}
                style={{
                  color: "#666",
                  cursor: "pointer",
                  fontSize: "14px",
                  textDecoration: "underline",
                }}
              >
                Code expired? Click to resend
              </span>
            </div>
          </div>
        )}

        {step === "verified" && (
          <>
            {message && (
              <div className={`auth-message ${getMessageType(message)}`}>
                {message}
              </div>
            )}
            <ResetPasswordForm onSubmit={handlePasswordReset} />
          </>
        )}

        <div className="auth-link">
          <button
            onClick={() => navigate("/")}
            style={{
              background: "none",
              border: "none",
              color: "#000000",
              cursor: "pointer",
              fontWeight: "700",
              fontSize: "15px",
              textDecoration: "none",
            }}
          >
            Back to Login
          </button>
        </div>
      </div>
    </div>
  );
}
