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
      setMessage("Error: All fields are required.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setMessage("Error: Passwords do not match.");
      return;
    }

    if (!validatePassword(form.password)) {
      setMessage(
        "Error: Password must be at least 8 characters long and contain both uppercase and lowercase English letters."
      );
      return;
    }

    const result = await sendVerificationCode(form.email);
    setMessage(result.message);
    if (result.success) setStep(3);
  };

  const handleVerifyCode = async () => {
    const result = await verifyCode(form.email, code);
    setMessage(result.message);
    if (result.success) setStep(4);
  };

  const handleRegister = async () => {
    // Final registration attempt
    const result = await register(
      form.username,
      form.password,
      form.confirmPassword,
      form.role,
      form.email
    );

    if (result.success) {
      // Show confirmation popup instead of auto-redirect
      if (
        window.confirm(
          "✅ Registration successful!\n\nYour account is pending admin approval.\n\nClick OK to go to the login page."
        )
      ) {
        navigate("/");
      }
    } else {
      setMessage(result.message);
    }
  };

  const handleResendCode = async () => {
    // Allow resending code
    const result = await sendVerificationCode(form.email);
    setMessage(result.message);
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
            <button onClick={handleVerifyCode} className="auth-btn">
              Verify
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

        {step === 4 && (
          <button onClick={handleRegister} className="auth-btn">
            Register
          </button>
        )}

        {message && (
          <div
            className={`auth-message ${
              message.toLowerCase().includes("error") ? "error" : "success"
            }`}
          >
            {message}
          </div>
        )}

        <div className="auth-link">
          Already have an account? <Link to="/">Login</Link>
        </div>
      </div>
    </div>
  );
}
