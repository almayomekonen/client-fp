import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useRegistrations } from "../../context/RegistrationContext";
import { useEmailVerification } from "../../context/EmailVerificationContext";

export default function RegisterPage() {
  const { register } = useRegistrations(); // Registration functions
  const { sendVerificationCode, verifyCode } = useEmailVerification(); // Email functions

  const [form, setForm] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    role: "coder",
    email: "",
  });

  const [code, setCode] = useState("");
  const [step, setStep] = useState(1); // 1=details, 2=send email, 3=code, 4=final registration
  const [message, setMessage] = useState("");

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSendCode = async () => {
    const result = await sendVerificationCode(form.email);
    setMessage(result.message);
    if (result.success) setStep(3); // Move to code step
  };

  const handleVerifyCode = async () => {
    const result = await verifyCode(form.email, code);
    setMessage(result.message);
    if (result.success) setStep(4); // Move to registration step
  };

  const handleRegister = async () => {
    const result = await register(
      form.username,
      form.password,
      form.confirmPassword,
      form.role,
      form.email
    );
    setMessage(result.message);
  };

  return (
    <div className="register-page">
      <h2>Registration</h2>

      {step === 1 && (
        <>
          <input
            name="username"
            placeholder="Username"
            value={form.username}
            onChange={handleChange}
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
          />
          <input
            type="password"
            name="confirmPassword"
            placeholder="Confirm Password"
            value={form.confirmPassword}
            onChange={handleChange}
          />
          <select name="role" value={form.role} onChange={handleChange}>
            <option value="coder">Coder</option>
            <option value="investigator">Investigator</option>
          </select>
          <input
            name="email"
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
          />
          <button onClick={handleSendCode}>Send Code</button>
        </>
      )}

      {step === 3 && (
        <>
          <input
            placeholder="Verification Code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <button onClick={handleVerifyCode}>Verify</button>
        </>
      )}

      {step === 4 && <button onClick={handleRegister}>Register</button>}

      {message && <p>{message}</p>}
      <p>
        Already have an account? <Link to="/">Login</Link>
      </p>
    </div>
  );
}
