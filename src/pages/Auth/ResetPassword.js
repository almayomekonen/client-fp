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
  const { resetPassword } = useUsers(); // ניגשים ל-users כדי למצוא את המייל
  const { sendVerificationCode, verifyCode } = useEmailVerification();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [codeFromUser, setCodeFromUser] = useState("");
  const [step, setStep] = useState("enterUsername");

  const handleSendCode = async () => {
    if (!username) {
      setMessage("נא להזין שם משתמש");
      return;
    }

    // מוצאים את המייל לפי שם המשתמש
    const user = users.find((u) => u.username === username);
    if (!user) {
      setMessage("שם משתמש לא קיים");
      return;
    }
    const userEmail = user.email;
    setEmail(userEmail);

    // שולחים את הקוד למייל
    const result = await sendVerificationCode(userEmail);
    setMessage(result.message);
    if (result.success) {
      setStep("waitingForCode");
    }
  };

  const handleVerifyCode = async () => {
    if (!codeFromUser) {
      setMessage("נא להזין קוד");
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
      setMessage("משתמש לא נמצא");
      return;
    }

    const result = await resetPassword(user._id, newPassword); // שולח userId
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
          <h1 className="auth-title">שחזור סיסמה</h1>
          <p className="auth-subtitle">אפס את הסיסמה שלך</p>
        </div>

        {step === "enterUsername" && (
          <div className="auth-form">
            <div className="auth-form-group">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="שם משתמש"
                className="auth-input"
                required
              />
            </div>
            <button onClick={handleSendCode} className="auth-btn">
              שלח קוד למייל
            </button>
          </div>
        )}

        {step === "waitingForCode" && (
          <div className="auth-form">
            <div className="auth-message info">
              נשלח קוד אימות למייל: <strong>{email}</strong>
            </div>
            <div className="auth-form-group">
              <input
                type="text"
                value={codeFromUser}
                onChange={(e) => setCodeFromUser(e.target.value)}
                placeholder="קוד אימות"
                className="auth-input"
                required
              />
            </div>
            <button onClick={handleVerifyCode} className="auth-btn">
              אמת קוד
            </button>
          </div>
        )}

        {step === "verified" && (
          <ResetPasswordForm onSubmit={handlePasswordReset} />
        )}

        {message && (
          <div
            className={`auth-message ${
              message.includes("שגיאה")
                ? "error"
                : message.includes("בהצלחה")
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
            חזרה להתחברות
          </button>
        </div>
      </div>
    </div>
  );
}
