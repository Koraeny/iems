# IEMS — Intelligent Energy Management System for Smart Offices
**Catholic University of Eastern Africa | Computer Science Final Year Project 2026**
**Student:** Cheshari Mwaror Koreeny | **Reg No:** 1049089
**Supervisor:** Dr. Stanley Chege

---

## Project Structure

```
iems/
├── backend/          ← Flask REST API
│   ├── app.py        ← App factory & entry point
│   ├── extensions.py ← SQLAlchemy & JWT instances
│   ├── models.py     ← Database models (User, Zone, EnergyReading, Alert, ...)
│   ├── ai_engine.py  ← Simulation, anomaly detection, linear regression
│   ├── seed.py       ← Populate DB with sample data
│   ├── requirements.txt
│   └── routes/
│       ├── auth.py       ← /api/auth
│       ├── energy.py     ← /api/energy
│       ├── alerts.py     ← /api/alerts
│       ├── settings.py   ← /api/settings
│       └── reports.py    ← /api/reports
└── frontend/         ← React.js SPA
    └── src/
        ├── App.jsx         ← Routing & Auth context
        ├── pages/
        │   ├── LandingPage.jsx
        │   ├── Login.jsx
        │   ├── SignUp.jsx
        │   ├── Dashboard.jsx
        │   ├── AlertsPage.jsx
        │   └── SettingsPage.jsx
        ├── components/
        │   └── Sidebar.jsx
        └── utils/
            └── api.js      ← All API calls
```

---

## Setup Instructions

### Prerequisites
- Python 3.10+
- Node.js 18+
- MySQL 8+

---

### 1. MySQL Database

```sql
CREATE DATABASE iems_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'iems_user'@'localhost' IDENTIFIED BY 'password';
GRANT ALL PRIVILEGES ON iems_db.* TO 'iems_user'@'localhost';
FLUSH PRIVILEGES;
```

---

### 2. Backend Setup

```bash
cd backend
pip install -r requirements.txt

# Edit DATABASE_URL in app.py if needed, then:
python seed.py       # Creates tables + sample data
python app.py        # Starts Flask on http://localhost:5000
```

**Default credentials after seeding:**
| Role          | Email                | Password    |
|---------------|----------------------|-------------|
| Administrator | admin@iems.ac.ke     | Admin@1234  |
| General User  | staff@iems.ac.ke     | Staff@1234  |

---

### 3. Frontend Setup

```bash
cd frontend
npm install
npm start            # Starts React on http://localhost:3000
```

---

## API Endpoints

| Method | Endpoint                    | Description                        |
|--------|-----------------------------|------------------------------------|
| POST   | /api/auth/register          | Register a new user                |
| POST   | /api/auth/login             | Login, returns JWT token           |
| GET    | /api/auth/me                | Get current user info              |
| GET    | /api/energy/zones           | List all office zones              |
| GET    | /api/energy/readings        | Get energy readings (filter by zone/hours) |
| POST   | /api/energy/simulate        | Generate one simulated reading per zone |
| GET    | /api/energy/stats           | Dashboard stats (24h totals)       |
| GET    | /api/energy/predict         | Linear regression prediction       |
| GET    | /api/alerts/                | Get unresolved alerts              |
| PATCH  | /api/alerts/:id/resolve     | Resolve a single alert             |
| PATCH  | /api/alerts/resolve-all     | Resolve all alerts                 |
| GET    | /api/settings/              | Get system settings                |
| POST   | /api/settings/              | Update system settings             |
| GET    | /api/reports/daily          | Daily energy report                |
| GET    | /api/reports/hourly         | Hourly energy report (last 24h)    |

---

## AI Engine Summary (ai_engine.py)

| Function           | Method                    | Purpose                              |
|--------------------|---------------------------|--------------------------------------|
| `simulate_reading` | Time-based load model     | Generates realistic energy data      |
| `detect_anomaly`   | Mean ± N×Std deviation    | Flags statistically abnormal readings|
| `predict_next_month`| Simple Linear Regression | Forecasts monthly consumption & cost |

---

## Tech Stack

| Layer      | Technology              |
|------------|-------------------------|
| Frontend   | React.js, Recharts      |
| Backend    | Python Flask            |
| Database   | MySQL + SQLAlchemy ORM  |
| Auth       | JWT (Flask-JWT-Extended)|
| AI/ML      | Pure Python (statistics module) |
| Security   | Bcrypt password hashing |
