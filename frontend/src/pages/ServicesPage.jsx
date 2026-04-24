import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import logo from "../assets/wasco-logo.png";

const fallbackServices = [
  { service:"Water Bill Enquiries", audience:"Everyone — No Login Required", description:"Access WASCO billing support, service information, billing rates, and payment guidance without needing to create an account.", icon:"💧" },
  { service:"Customer Self-Service Portal", audience:"Registered Customers", description:"View your bills, outstanding balances, full payment history, monthly water usage, and submit leakage reports from your personal portal.", icon:"👤" },
  { service:"Administrator Control Panel", audience:"WASCO Administrators", description:"Manage customers, billing rates, water usage readings, generate bills, record payments, and handle leakage reports across all districts.", icon:"⚙️" },
  { service:"Branch Manager Insights", audience:"WASCO Branch Managers", description:"View daily, weekly, monthly, quarterly, and yearly billing and water usage analytics and summaries for your branch and district.", icon:"📊" },
];

const districts = [
  "Maseru","Leribe","Berea","Mafeteng","Mohale's Hoek","Quthing","Qacha's Nek","Mokhotlong","Thaba-Tseka","Butha-Buthe"
];

export function ServicesPage() {
  const [services, setServices] = useState(fallbackServices);

  useEffect(() => {
    api.get("/meta").then((data) => {
      if (Array.isArray(data.publicServices) && data.publicServices.length) {
        setServices(data.publicServices);
      }
    }).catch(() => {});
  }, []);

  return (
    <div className="landing-page">
      {/* ── Hero ── */}
      <section className="landing-hero hero-card">
        <div className="landing-hero-inner">
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:16 }}>
              <img src={logo} alt="WASCO" style={{ width:68, height:"auto", display:"block", filter:"drop-shadow(0 4px 10px rgba(16,66,102,.15))" }} />
              <div>
                <h2 style={{ margin:0, fontSize:"1.7rem", fontWeight:700, color:"var(--text)" }}>WASCO</h2>
                <p style={{ margin:0, color:"var(--muted)", fontSize:".9rem" }}>Water &amp; Sewerage Company, Kingdom of Lesotho</p>
              </div>
            </div>
            <h1>Distributed Online Water Bill Management Database Application</h1>
            <p className="landing-copy">
              A fully distributed, heterogeneous database application providing a unified interface for
              water usage tracking, bill generation, payment processing, leakage reporting, and
              branch-level analytics across all 10 districts of Lesotho. Built on PostgreSQL and MySQL
              for high availability and data integrity.
            </p>
            <div className="landing-actions">
              <Link className="btn primary" to="/login" style={{ padding:"11px 22px", fontSize:".95rem" }}>🔐 Sign In to Portal</Link>
              <a className="btn" href="#services" style={{ padding:"11px 22px", fontSize:".95rem" }}>View Services ↓</a>
            </div>
            <div className="credentials-card">
              <strong>Demo Accounts — Quick Access:</strong>
              <span>🔑 Admin: admin / admin123</span>
              <span>🏢 Branch Manager: manager / manager123</span>
              <span>👤 Customer: samuel / admin123</span>
            </div>
          </div>
          <div className="hero-water">
            <img src={logo} alt="WASCO" />
          </div>
        </div>
      </section>

      {/* ── Service cards ── */}
      <section id="services" className="services-grid">
        {services.map((item) => (
          <article key={item.service} className="service-card">
            <div style={{ fontSize:"2rem", marginBottom:10 }}>{item.icon || "💧"}</div>
            <span className="service-tag">{item.audience}</span>
            <h3>{item.service}</h3>
            <p>{item.description}</p>
          </article>
        ))}
      </section>

      {/* ── Districts covered ── */}
      <section style={{ maxWidth:1140, margin:"28px auto 0", padding:"0 0 8px" }}>
        <div className="table-card" style={{ padding:"22px 24px" }}>
          <h3 style={{ margin:"0 0 14px", fontSize:"1rem", fontWeight:700 }}>🗺️ Districts Covered — All 10 Districts of Lesotho</h3>
          <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
            {districts.map((d) => (
              <span key={d} style={{
                background:"var(--sky)", color:"#0f76a5", padding:"5px 13px",
                borderRadius:999, fontSize:".82rem", fontWeight:600,
                border:"1px solid #b8e4f7",
              }}>{d}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <p style={{ textAlign:"center", color:"var(--muted)", fontSize:".82rem", marginTop:28 }}>
        © {new Date().getFullYear()} WASCO — Water &amp; Sewerage Company, Kingdom of Lesotho &nbsp;·&nbsp; Distributed Database Application
      </p>
    </div>
  );
}
