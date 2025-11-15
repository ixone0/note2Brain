import React, { useState, useEffect } from "react";
import "./Register.css";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordValidation, setPasswordValidation] = useState({
    length: false,
    number: false,
    uppercase: false,
  });
  const [passwordMatch, setPasswordMatch] = useState(false);
  const [showError, setShowError] = useState(false);
  const [notification, setNotification] = useState({ message: "", type: "" });

  const navigate = useNavigate();

  useEffect(() => {
    setPasswordValidation({
      length: password.length >= 8,
      number: /[0-9]/.test(password),
      uppercase: /[A-Z]/.test(password),
    });
  }, [password]);

  useEffect(() => {
    if (confirmPassword) {
      setPasswordMatch(password === confirmPassword);
    } else {
      setPasswordMatch(false);
    }
  }, [password, confirmPassword]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!Object.values(passwordValidation).every(Boolean) || !passwordMatch) {
      return;
    }

    try {
      const res = await fetch("https://note2brain-backend.onrender.com/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email,
          password: password,
          confirm_password: confirmPassword
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setNotification({ message: "Registration successful! Redirecting to login...", type: "success" });
        setTimeout(() => {
          navigate("/login");
        }, 1500);
      } else {
        setNotification({ message: data.detail || "Registration failed", type: "error" });
      }
    } catch (err) {
      setNotification({ message: "Network error", type: "error" });
      console.error(err);
    }
  };

  const allValid = Object.values(passwordValidation).every(Boolean);

  return (
    <div className="register-page">
      <div className="register-container">
        <div className="register-content">
          <h1>Getting Started</h1>
          <p className="subtitle">Seems you are new here. Let's set up your profile.</p>

          {/* Notification */}
          {notification.message && (
            <div className={`register-notification ${notification.type}`}>
              {notification.message}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <div className={`password-status ${
              !confirmPassword ? 'neutral' : 
              passwordMatch ? 'match' : 'not-match'
            }`}>
              {!confirmPassword ? 'Password do not match' :
                passwordMatch ? 'Password match' : 'Password do not match'}
            </div>

            <div className={`password-rules ${allValid ? 'all-valid' : ''}`}>
              <div className={`rule ${passwordValidation.length ? 'valid' : 'invalid'}`}>
                <span className="rule-icon">
                  {passwordValidation.length ? '✓' : '✕'}
                </span>
                Password must be at least 8 characters long.
              </div>
              <div className={`rule ${passwordValidation.number ? 'valid' : 'invalid'}`}>
                <span className="rule-icon">
                  {passwordValidation.number ? '✓' : '✕'}
                </span>
                Password must contain at least one digit (0-9).
              </div>
              <div className={`rule ${passwordValidation.uppercase ? 'valid' : 'invalid'}`}>
                <span className="rule-icon">
                  {passwordValidation.uppercase ? '✓' : '✕'}
                </span>
                Password must contain at least one uppercase letter.
              </div>
            </div>

            <button 
              type="submit" 
              className="continue-btn"
              disabled={!allValid || !passwordMatch}
              onMouseEnter={() => setShowError(true)}
              onMouseLeave={() => setShowError(false)}
            >
              <span>c</span>
              <span>o</span>
              <span>n</span>
              <span>t</span>
              <span>i</span>
              <span>n</span>
              <span>u</span>
              <span>e</span>
            </button>
          </form>

          <div className="login-link">
            Already have an account? <a href="#" onClick={(e) => {e.preventDefault(); navigate('/login')}}>Login</a>
          </div>
        </div>

        <div className="register-image">
          <img src="/logo.png" alt="Notebook" />
        </div>
      </div>
    </div>
  );
}