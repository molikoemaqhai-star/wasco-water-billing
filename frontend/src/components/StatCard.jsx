export function StatCard({ label, value, tone = "sky", icon, sub }) {
  return (
    <div className={`stat-card tone-${tone}`}>
      {icon && <div className="stat-card-icon">{icon}</div>}
      <div className="stat-card-label">{label}</div>
      <div className="stat-card-value">{value ?? "—"}</div>
      {sub && <div className="stat-card-sub">{sub}</div>}
    </div>
  );
}
