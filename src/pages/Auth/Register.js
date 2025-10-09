import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useRegistrations } from '../../context/RegistrationContext';
import { useEmailVerification } from '../../context/EmailVerificationContext';

export default function RegisterPage() {
  const { register } = useRegistrations();                  // פונקציות רישום
  const { sendVerificationCode, verifyCode } = useEmailVerification(); // פונקציות אימייל

  const [form, setForm] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    role: 'coder',
    email: ''
  });

  const [code, setCode] = useState('');
  const [step, setStep] = useState(1); // 1=פרטים, 2=שליחת אימייל, 3=קוד, 4=רישום סופי
  const [message, setMessage] = useState('');

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSendCode = async () => {
    const result = await sendVerificationCode(form.email);
    setMessage(result.message);
    if (result.success) setStep(3); // מעבר לשלב קוד
  };

  const handleVerifyCode = async () => {
    const result = await verifyCode(form.email, code);
    setMessage(result.message);
    if (result.success) setStep(4); // מעבר לשלב רישום
  };

  const handleRegister = async () => {
    const result = await register(form.username, form.password, form.confirmPassword, form.role, form.email);
    setMessage(result.message);
  };

  return (
    <div className="register-page">
      <h2>הרשמה</h2>

      {step === 1 && (
        <>
          <input name="username" placeholder="שם משתמש" value={form.username} onChange={handleChange} />
          <input type="password" name="password" placeholder="סיסמה" value={form.password} onChange={handleChange} />
          <input type="password" name="confirmPassword" placeholder="אימות סיסמה" value={form.confirmPassword} onChange={handleChange} />
          <select name="role" value={form.role} onChange={handleChange}>
            <option value="coder">מקודד</option>
            <option value="investigator">חוקר</option>
          </select>
          <input name="email" type="email" placeholder="אימייל" value={form.email} onChange={handleChange} />
          <button onClick={handleSendCode}>שלח קוד</button>
        </>
      )}

      {step === 3 && (
        <>
          <input placeholder="קוד אימות" value={code} onChange={e => setCode(e.target.value)} />
          <button onClick={handleVerifyCode}>אמת</button>
        </>
      )}

      {step === 4 && (
        <button onClick={handleRegister}>הירשם</button>
      )}

      {message && <p>{message}</p>}
      <p>כבר יש לך חשבון? <Link to="/">להתחברות</Link></p>
    </div>
  );
}
