import React, { useState } from "react";
import { useUsers } from "../../context/UserContext";
import { useEmailVerification } from "../../context/EmailVerificationContext";
import { useNavigate } from "react-router-dom";
import ResetPasswordForm from "../../components/Auth/ResetPasswordForm";
import { useData } from "../../context/DataContext";
import "../../styles/Auth.css";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const { users } = useData();
  const { resetPassword } = useUsers(); // Access users to find the email
  const { sendVerificationCode, verifyCode } = useEmailVerification();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [codeFromUser, setCodeFromUser] = useState("");
  const [step, setStep] = useState("enterUsername");

  const handleSendCode = async () => {
    if (!username) {
      setMessage("Please enter username");
      return;
    }

    // Find email by username
    const user = users.find((u) => u.username === username);
    if (!user) {
      setMessage("Username does not exist");
      return;
    }
    const userEmail = user.email;
    setEmail(userEmail);

    // Send the code to email
    const result = await sendVerificationCode(userEmail);
    setMessage(result.message);
    if (result.success) {
      setStep("waitingForCode");
    }
  };

  const handleVerifyCode = async () => {
    if (!codeFromUser) {
      setMessage("Please enter code");
      return;
    }

    const result = await verifyCode(email, codeFromUser);
    setMessage(result.message);
    if (result.success) {
      setStep("verified");
    }
  };

  const handlePasswordReset = async (newPassword) => {
    const user = users.find((u) => u.username === username);
    if (!user) {
      setMessage("User not found");
      return;
    }

    const result = await resetPassword(user._id, newPassword); // Send userId
    setMessage(result.message);
    if (result.success) {
      setTimeout(() => navigate("/"), 2000);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">🔑</div>
          <h1 className="auth-title">Reset Password</h1>
          <p className="auth-subtitle">Reset your password</p>
        </div>

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
            <div className="auth-message info">
              A verification code has been sent to: <strong>{email}</strong>
            </div>
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
          </div>
        )}

        {step === "verified" && (
          <ResetPasswordForm onSubmit={handlePasswordReset} />
        )}

        {message && (
          <div
            className={`auth-message ${
              message.toLowerCase().includes("error")
                ? "error"
                : message.toLowerCase().includes("success")
                ? "success"
                : "info"
            }`}
          >
            {message}
          </div>
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
