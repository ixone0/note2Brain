import React, { useState } from "react";
import "./Login.css";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [notification, setNotification] = useState({ message: "", type: "" });
  const navigate = useNavigate();

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setNotification({ message: "", type: "" });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 5000);

    try {
      const res = await fetch("https://note2brain-backend.onrender.com/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('userId', data.user_id.toString());
        navigate("/home");
      } else {
        setNotification({ message: data.detail || "Login failed", type: "error" });
      }
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === "AbortError") {
        setNotification({ message: "Request timed out. Please try again later.", type: "error" });
      } else {
        setNotification({ message: "Network error", type: "error" });
      }
    }
  };


  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-content">
          <h1>Welcome Back</h1>
          <p className="subtitle">Please enter your details to sign in.</p>

          {/* แจ้งเตือน */}
          {notification.message && (
            <div
              className={`login-notification ${notification.type}`}
              style={{
                marginBottom: "1.2rem",
                padding: "12px 18px",
                borderRadius: "8px",
                fontSize: "15px",
                fontWeight: 500,
                textAlign: "center",
                background: notification.type === "error" ? "#fef2f2" : "#ecfdf5",
                color: notification.type === "error" ? "#dc2626" : "#059669",
                border: notification.type === "error" ? "1px solid #fecaca" : "1px solid #6ee7b7",
                animation: "fadeIn 0.4s"
              }}
            >
              {notification.message}
            </div>
          )}

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
            <button type="submit" className="continue-btn">
              Sign In
            </button>
          </form>

          <div className="register-link">
            Don't have an account?{" "}
            <button
              type="button"
              className="link-btn"
              onClick={() => navigate("/register")}
              style={{
                background: "none",
                border: "none",
                color: "#3b82f6",
                textDecoration: "underline",
                fontWeight: 600,
                cursor: "pointer",
                padding: 0,
                fontSize: "inherit"
              }}
            >
              Sign Up
            </button>
          </div>
        </div>

        <div className="login-image">
          <img src="/logo.png" alt="Notebook" />
        </div>
      </div>
    </div>
  );
}