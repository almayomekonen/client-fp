import React, { useState } from "react";
import { useUsers } from "../../context/UserContext";
import { useEmailVerification } from "../../context/EmailVerificationContext";
import { useNavigate } from "react-router-dom";
import ResetPasswordForm from "../../components/Auth/ResetPasswordForm";
import { useData } from "../../context/DataContext";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const { users } = useData();
  const { resetPassword } = useUsers(); // Access users to find the email
  const { sendVerificationCode, verifyCode } = useEmailVerification();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [codeFromUser, setCodeFromUser] = useState("");
  const [step, setStep] = useState("enterUsername"); // enterUsername -> waitingForCode -> verified

  const handleSendCode = async () => {
    if (!username) {
      setMessage("Please enter username");
      return;
    }

    // Find the email by username
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
    <div className="reset-password-page">
      <h2>Password Recovery</h2>

      {step === "enterUsername" && (
        <>
          <label>Username:</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <button onClick={handleSendCode}>Send Code to Email</button>
        </>
      )}

      {step === "waitingForCode" && (
        <div>
          <p>
            Verification code sent to email: <strong>{email}</strong>
          </p>
          <label>Verification Code:</label>
          <input
            type="text"
            value={codeFromUser}
            onChange={(e) => setCodeFromUser(e.target.value)}
          />
          <button onClick={handleVerifyCode}>Verify Code</button>
        </div>
      )}

      {step === "verified" && (
        <ResetPasswordForm onSubmit={handlePasswordReset} />
      )}

      {message && <p className="form-message">{message}</p>}

      <button
        onClick={() => navigate("/")}
        style={{
          marginTop: "10px",
          padding: "6px 12px",
          backgroundColor: "#ccc",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
        }}
      >
        Cancel
      </button>
    </div>
  );
}
