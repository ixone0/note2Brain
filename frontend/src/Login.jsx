import React, { useState } from "react";
import "./Login.css";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const navigate = useNavigate();

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("https://note2brain-backend.onrender.com/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('userId', data.user_id.toString());
        navigate("/home");
        // สามารถ navigate ไปหน้าอื่นได้ เช่น navigate("/dashboard");
      } else {
        alert(data.detail || "Login failed");
      }
    } catch (err) {
      alert("Network error");
    }
  };

  const showForgotPassword = () => {
    alert("Forgot Password functionality would be implemented here");
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-content">
          <h1>Welcome Back</h1>
          <p className="subtitle">Please enter your details to sign in.</p>

          <form onSubmit={handleLoginSubmit}>
            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
              />
            </div>
            <div className="forgot-password">
              <a href="#" onClick={e => {e.preventDefault(); showForgotPassword();}}>
                Forgot Password?
              </a>
            </div>
            <button type="submit" className="continue-btn">
              Sign In
            </button>
          </form>

          <div className="register-link">
            Don't have an account? <a href="#" onClick={e => {e.preventDefault(); navigate("/register");}}>Sign Up</a>
          </div>
        </div>

        <div className="login-image">
          <img src="/logo.png" alt="Notebook" />
        </div>
      </div>
    </div>
  );
}