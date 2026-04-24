import { NavLink, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { DashboardPage } from "./pages/DashboardPage";
import { CustomersPage } from "./pages/CustomersPage";
import { RatesPage } from "./pages/RatesPage";
import { UsagePage } from "./pages/UsagePage";
import { BillsPage } from "./pages/BillsPage";
import { PaymentsPage } from "./pages/PaymentsPage";
import { LeakagesPage } from "./pages/LeakagesPage";
import { ReportsPage } from "./pages/ReportsPage";
import { LoginPage } from "./pages/LoginPage";
import { ServicesPage } from "./pages/ServicesPage";
import logo from "./assets/wasco-logo.png";

const NAV_ICONS = {
  "/dashboard": "🏠",
  "/customers": "👥",
  "/rates":     "💰",
  "/usage":     "💧",
  "/bills":     "📄",
  "/payments":  "💳",
  "/leakages":  "🔧",
  "/reports":   "📊",
};

const roleLinks = {
  ADMIN: [
    ["/dashboard", "Dashboard"],
    ["/customers", "Customers"],
    ["/rates",     "Billing Rates"],
    ["/usage",     "Water Usage"],
    ["/bills",     "Bills"],
    ["/payments",  "Payments"],
    ["/leakages",  "Leakages"],
    ["/reports",   "Reports"],
  ],
  BRANCH_MANAGER: [
    ["/dashboard", "Dashboard"],
    ["/usage",     "Water Usage"],
    ["/bills",     "Bills"],
    ["/payments",  "Payments"],
    ["/leakages",  "Leakages"],
    ["/reports",   "Manager Insights"],
  ],
  CUSTOMER: [
    ["/dashboard", "My Dashboard"],
    ["/bills",     "My Bills"],
    ["/payments",  "My Payments"],
    ["/usage",     "My Usage"],
    ["/leakages",  "Report Leakage"],
    ["/reports",   "My Profile"],
  ],
};

function roleLabel(role) {
  if (role === "ADMIN")          return "Administrator";
  if (role === "BRANCH_MANAGER") return "Branch Manager";
  return "Customer";
}
function topbarTitle(role) {
  if (role === "BRANCH_MANAGER") return "Branch Dashboard";
  if (role === "CUSTOMER")       return "Customer Portal";
  return "Admin Dashboard";
}
function roleColor(role) {
  if (role === "ADMIN")          return "#d6291f";
  if (role === "BRANCH_MANAGER") return "#e69c00";
  return "#19a663";
}

function Shell({ user, onLogout }) {
  const links      = roleLinks[user?.role] || roleLinks.CUSTOMER;
  const isCustomer = user?.role === "CUSTOMER";
  const initials   = (user?.full_name || "U").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="app-shell">
      <aside className={`sidebar${isCustomer ? " customer-sidebar" : ""}`}>

        {/* Brand block */}
        <div className="brand-block">
          <img src={logo} alt="WASCO" className="brand-image" />
          <div className="brand-text">
            <h2>WASCO</h2>
            <p>{isCustomer ? "Customer Portal" : "Water Billing System"}</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {links.map(([to, label]) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}
            >
              <span className="nav-link-icon">{NAV_ICONS[to] || "📌"}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User info + logout */}
        <div className="sidebar-footer">
          <div className="user-card">
            <strong>{user?.full_name}</strong>
            <span style={{ color: roleColor(user?.role), background:"rgba(255,255,255,.15)", display:"inline-block", padding:"2px 8px", borderRadius:99, fontSize:".72rem", fontWeight:700, marginTop:3 }}>
              {roleLabel(user?.role)}
            </span>
            {isCustomer && user?.account_number && (
              <span style={{ marginTop:4 }}>Account: {user.account_number}</span>
            )}
            {!isCustomer && user?.branch_id && (
              <span style={{ marginTop:4 }}>Branch ID: {user.branch_id}</span>
            )}
          </div>
          <button className="btn danger full" onClick={onLogout}>🚪 Logout</button>
        </div>
      </aside>

      <main className="dashboard-area">
        <header className="topbar">
          <div className="topbar-left">
            <span className="hamburger">☰</span>
            <strong className="topbar-title">{topbarTitle(user?.role)}</strong>
          </div>
          <div className="topbar-right">
            <span className="notify" title="Notifications">🔔</span>
            <div className="top-logo-mini">
              <img src={logo} alt="WASCO" />
            </div>
            <div className="top-user">
              <div className="avatar">{initials}</div>
              <div className="top-user-info">
                <strong>{user?.full_name}</strong>
                <small>{roleLabel(user?.role)}</small>
              </div>
            </div>
          </div>
        </header>

        <div className="main-content">
          <Routes>
            <Route path="/dashboard" element={<DashboardPage user={user} />} />
            <Route path="/customers" element={user?.role === "ADMIN" ? <CustomersPage user={user} /> : <Navigate to="/dashboard" replace />} />
            <Route path="/rates"     element={user?.role === "ADMIN" ? <RatesPage user={user} />     : <Navigate to="/dashboard" replace />} />
            <Route path="/usage"     element={<UsagePage    user={user} />} />
            <Route path="/bills"     element={<BillsPage    user={user} />} />
            <Route path="/payments"  element={<PaymentsPage user={user} />} />
            <Route path="/leakages"  element={<LeakagesPage user={user} />} />
            <Route path="/reports"   element={<ReportsPage  user={user} />} />
            <Route path="*"          element={<Navigate to={links[0]?.[0] || "/dashboard"} replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("wasco-user") || "null"); } catch { return null; }
  });

  const logout = () => {
    localStorage.removeItem("wasco-user");
    setUser(null);
    navigate("/");
  };

  useEffect(() => {
    if (user) localStorage.setItem("wasco-user", JSON.stringify(user));
  }, [user]);

  return (
    <Routes>
      <Route path="/"    element={<ServicesPage />} />
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage onLogin={setUser} />} />
      <Route path="/*"   element={user ? <Shell user={user} onLogout={logout} /> : <Navigate to="/login" replace />} />
    </Routes>
  );
}
