# WASCO — Distributed Online Water Bill Management Database Application
**Water & Sewerage Company | Kingdom of Lesotho**

---

## Overview

A full-stack distributed web database application for managing water billing, usage, payments, customers, and leakage reports across all 10 districts of Lesotho.

The system uses a **heterogeneous distributed database** architecture:
- **PostgreSQL** — Primary database (reads, complex queries, reports)
- **MySQL** — Replica/secondary database (writes are dual-committed to both)

---

## Tech Stack

| Layer     | Technology         |
|-----------|--------------------|
| Frontend  | React 18 + Vite    |
| Backend   | Node.js + Express  |
| DB (Primary)  | PostgreSQL     |
| DB (Secondary) | MySQL         |
| Styling   | Custom CSS (no Tailwind) |

---

## User Roles

| Role | Username | Password | Access |
|------|----------|----------|--------|
| Administrator | `admin` | `admin123` | Full system access |
| Branch Manager | `manager` | `manager123` | Reports & insights |
| Customer | `samuel` | `admin123` | Self-service portal |

---

## Setup

### 1. Database Setup

```bash
# PostgreSQL
psql -U postgres -c "CREATE DATABASE wasco_water_billing;"
psql -U postgres -d wasco_water_billing -f database/postgresql/schema.sql
psql -U postgres -d wasco_water_billing -f database/postgresql/seed.sql
psql -U postgres -d wasco_water_billing -f database/postgresql/advanced_sql.sql

# MySQL
mysql -u root -p -e "CREATE DATABASE wasco_water_billing;"
mysql -u root -p wasco_water_billing < database/mysql/schema.sql
mysql -u root -p wasco_water_billing < database/mysql/seed.sql
```

### 2. Backend

```bash
cd backend
cp .env.example .env        # edit credentials as needed
npm install
npm run dev                 # runs on http://localhost:4000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev                 # runs on http://localhost:5173
```

---

## Features

### Admin Dashboard
- Customer management (Add / Edit / Delete) with district selection
- Billing rate tiers (Residential / Commercial / Institutional)
- Water usage meter readings
- Bill generation from usage records
- Payment recording (Cash, Card, Mobile Money, Bank Transfer)
- Leakage report management
- Full reports (period, branch, usage by type, outstanding balances)

### Branch Manager Dashboard
- Branch-level performance overview
- Daily / Weekly / Monthly / Quarterly / Yearly insights
- Usage analytics and billing summaries

### Customer Portal
- Account summary with outstanding balance
- Bill history with payment status
- Payment form with bill selection
- Water usage history by meter
- Leakage report submission
- Profile and usage analytics

### Landing Page
- Public services overview
- Quick demo account access
- All 10 districts of Lesotho listed

---

## Database Distribution

Every write (INSERT / UPDATE / DELETE) is committed to **both** PostgreSQL and MySQL inside a coordinated transaction. Reads are served from PostgreSQL.

This satisfies the assignment requirement for:
> "Distribute this water billing application across at least two (2) different databases."

