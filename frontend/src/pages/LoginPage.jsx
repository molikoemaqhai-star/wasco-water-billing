import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import logo from "../assets/wasco-logo.png";

export function LoginPage({ onLogin }) {
  const [form, setForm] = useState({ username: "admin", password: "admin123" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await api.post("/auth/login", {
        username: form.username.trim(),
        password: form.password.trim()
      });

      localStorage.setItem("wasco-user", JSON.stringify(result.user));

      onLogin(result.user);
    } catch (err) {
      setError(err.message || "Invalid username or password.");
    } finally {
      setLoading(false);
    }
  }

  function fillDemo(username, password) {
    setForm({ username, password });
    setError("");
  }

  return (
    <div className="login-page">
      <div className="login-split">
        <div className="login-promo hero-water">
          <img src={logo} alt="WASCO Logo" />
          <div className="promo-copy">
            <h1>WASCO</h1>
            <p>Water &amp; Sewerage Company</p>
          </div>
        </div>

        <form className="login-card" onSubmit={submit}>
          <div className="login-brand">
            <img src={logo} alt="WASCO" className="brand-image" />
            <h2>Welcome Back</h2>
            <p>Sign in to your WASCO account</p>
          </div>

          {error && <div className="alert error">⚠️ {error}</div>}

          <label>
            Username
            <input
              value={form.username}
              placeholder="Enter username"
              autoComplete="username"
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              placeholder="Enter password"
              value={form.password}
              autoComplete="current-password"
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </label>

          <div className="login-options">
            <label style={{ flexDirection: "row", gap: 6, marginBottom: 0, fontWeight: 400 }}>
              <input type="checkbox" style={{ width: "auto" }} readOnly defaultChecked /> Remember me
            </label>
            <span className="muted" style={{ cursor: "pointer" }}>Forgot Password?</span>
          </div>

          <button className="btn primary full" disabled={loading}>
            {loading ? "Signing in…" : "🔐 Login"}
          </button>

          <div className="demo-accounts">
            <strong>Demo Accounts — click to fill:</strong>
            <span style={{ cursor: "pointer", color: "var(--primary-dark)" }} onClick={() => fillDemo("admin", "admin123")}>
              🔑 Admin: admin / admin123
            </span>
            <span style={{ cursor: "pointer", color: "var(--primary-dark)" }} onClick={() => fillDemo("manager", "manager123")}>
              🏢 Branch Manager: manager / manager123
            </span>
            <span style={{ cursor: "pointer", color: "var(--primary-dark)" }} onClick={() => fillDemo("samuel", "admin123")}>
              👤 Customer: samuel / admin123
            </span>
          </div>

          <Link to="/" className="btn ghost full" style={{ justifyContent: "center", marginTop: 4 }}>
            ← Back to Services
          </Link>
        </form>
      </div>
    </div>
  );
}