import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useRegistrations } from "../../context/RegistrationContext";
import { useEmailVerification } from "../../context/EmailVerificationContext";
import "../../styles/Auth.css";

export default function RegisterPage() {
  const { register } = useRegistrations();
  const { sendVerificationCode, verifyCode } = useEmailVerification();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    role: "coder",
    email: "",
  });

  const [code, setCode] = useState("");
  const [step, setStep] = useState(1);
  const [message, setMessage] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  // Validate password complexity
  const validatePassword = (pwd) => {
    // Minimum 8 characters, at least one uppercase, and one lowercase letter
    const regex = /^(?=.*[a-z])(?=.*[A-Z]).{8,}$/;
    return regex.test(pwd);
  };

  const handleSendCode = async () => {
    // 1. Client-side validation before sending code
    if (
      !form.username ||
      !form.email ||
      !form.password ||
      !form.confirmPassword
    ) {
      setMessage("❌ All fields are required.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setMessage("❌ Passwords do not match.");
      return;
    }

    if (!validatePassword(form.password)) {
      setMessage(
        "❌ Password must be at least 8 characters long and contain both uppercase and lowercase English letters."
      );
      return;
    }

    // Show loading state
    setMessage("📧 Sending verification code...");
    
    const result = await sendVerificationCode(form.email);
    
    // Display the exact message from the API
    if (result.success) {
      setMessage("✅ " + result.message);
      setStep(3);
    } else {
      setMessage("❌ " + result.message);
    }
  };

  const handleRegister = async () => {
    if (!code) {
      setMessage("❌ Please enter the verification code.");
      return;
    }

    // Show loading state
    setMessage("🔍 Verifying code and registering...");
    
    // First, verify the code
    const verifyResult = await verifyCode(form.email, code);
    
    if (!verifyResult.success) {
      setMessage("❌ " + verifyResult.message);
      return;
    }

    // If verification successful, proceed with registration
    const registerResult = await register(
      form.username,
      form.password,
      form.confirmPassword,
      form.role,
      form.email
    );

    if (registerResult.success) {
      setMessage("");
      setShowSuccessModal(true);
    } else {
      setMessage("❌ " + registerResult.message);
    }
  };

  const handleResendCode = async () => {
    // Allow resending code
    setMessage("📧 Resending verification code...");
    const result = await sendVerificationCode(form.email);
    
    // Display the exact message from the API
    if (result.success) {
      setMessage("✅ " + result.message);
    } else {
      setMessage("❌ " + result.message);
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
        msg.toLowerCase().includes("do not match") ||
        msg.toLowerCase().includes("required")) {
      return "error";
    }
    
    // Success messages (green)
    if (msg.includes("✅") ||
        msg.toLowerCase().includes("success") ||
        msg.toLowerCase().includes("sent to email") ||
        msg.toLowerCase().includes("code sent")) {
      return "success";
    }
    
    // Info/loading messages (blue)
    return "info";
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">📝</div>
          <h1 className="auth-title">Registration</h1>
          <p className="auth-subtitle">Create a new account</p>
        </div>

        {step === 1 && (
          <div className="auth-form">
            <div className="auth-form-group">
              <input
                name="username"
                placeholder="Username"
                value={form.username}
                onChange={handleChange}
                className="auth-input"
                required
              />
            </div>
            <div className="auth-form-group">
              <input
                type="password"
                name="password"
                placeholder="Password"
                value={form.password}
                onChange={handleChange}
                className="auth-input"
                required
              />
            </div>
            <div className="auth-form-group">
              <input
                type="password"
                name="confirmPassword"
                placeholder="Confirm Password"
                value={form.confirmPassword}
                onChange={handleChange}
                className="auth-input"
                required
              />
            </div>
            <div className="auth-form-group">
              <select
                name="role"
                value={form.role}
                onChange={handleChange}
                className="auth-select"
              >
                <option value="coder">Coder</option>
                <option value="investigator">Researcher</option>
              </select>
            </div>
            <div className="auth-form-group">
              <input
                name="email"
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={handleChange}
                className="auth-input"
                required
              />
            </div>
            <button onClick={handleSendCode} className="auth-btn">
              Send Code
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="auth-form">
            <div className="auth-form-group">
              <input
                placeholder="Verification Code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="auth-input"
                required
              />
            </div>
            <button onClick={handleRegister} className="auth-btn">
              Register
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

        {message && (
          <div className={`auth-message ${getMessageType(message)}`}>
            {message}
          </div>
        )}

        <div className="auth-link">
          Already have an account? <Link to="/">Login</Link>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="modal-overlay">
          <div className="modal-content success-modal">
            <div className="modal-icon success-icon">✅</div>
            <h2 className="modal-title">Registration Successful!</h2>
            <p className="modal-text">
              Your account has been created and is pending admin approval.
            </p>
            <p className="modal-text">
              You will be notified once your account is approved.
            </p>
            <button
              onClick={() => navigate("/")}
              className="modal-btn success-btn"
            >
              Go to Login
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
