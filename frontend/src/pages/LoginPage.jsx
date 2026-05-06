<div className="demo-accounts">
  <strong>Demo Accounts — click to fill:</strong>

  <span
    style={{ cursor: "pointer", color: "var(--primary-dark)" }}
    onClick={() => fillDemo("admin", "admin123")}
  >
    🔑 Admin: admin / admin123
  </span>

  <span
    style={{ cursor: "pointer", color: "var(--primary-dark)" }}
    onClick={() => fillDemo("manager", "manager123")}
  >
    🏢 Branch Manager: manager / manager123
  </span>

  <span
    style={{ cursor: "pointer", color: "var(--primary-dark)" }}
    onClick={() => fillDemo("thabo", "admin123")}
  >
    👤 Customer: thabo / admin123
  </span>
</div>