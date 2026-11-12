# QueueSense — Digital Hospital Queue & Appointment Management System

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React%2018%20%2B%20Vite-61DAFB.svg?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Python](https://img.shields.io/badge/Language-Python%203.10+-3776AB.svg?logo=python&logoColor=white)](https://python.org)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB%20Atlas-47A248.svg?logo=mongodb&logoColor=white)](https://www.mongodb.com)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind%20CSS-38B2AC.svg?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)

**QueueSense** is a full-stack, enterprise-grade digital queue management and appointment booking platform tailored for hospitals, multi-specialty clinical centers, and healthcare organizations. 

Designed with a restrained, minimal, and traditional aesthetic inspired by modern enterprise SaaS products, QueueSense simplifies the patient journey from online booking to physical clinic arrival, digital token generation, real-time queue position tracking, and counter service.

---

## Table of Contents
1. [Core Features](#core-features)
2. [End-to-End System Workflows](#end-to-end-system-workflows)
   - [Workflow 1: Patient Registration & Real Email OTP Verification](#workflow-1-patient-registration--real-email-otp-verification)
   - [Workflow 2: Official Google OAuth 2.0 Single Sign-On](#workflow-2-official-google-oauth-20-single-sign-on)
   - [Workflow 3: Appointment Booking & Slot Reservation](#workflow-3-appointment-booking--slot-reservation)
   - [Workflow 4: Digital Token Generation & Live Queue Progression](#workflow-4-digital-token-generation--live-queue-progression)
   - [Workflow 5: Clinical Counter Administration & Queue Calling](#workflow-5-clinical-counter-administration--queue-calling)
3. [Design System & Color Tokens](#design-system--color-tokens)
4. [Technology Stack](#technology-stack)
5. [System Architecture](#system-architecture)
6. [Repository Structure](#repository-structure)
7. [Local Installation & Setup](#local-installation--setup)
8. [Production Cloud Deployment Guide](#production-cloud-deployment-guide)
   - [Deploying Backend to Render](#deploying-backend-to-render)
   - [Deploying Frontend to Vercel](#deploying-frontend-to-vercel)
9. [Default Test Credentials](#default-test-credentials)
10. [Security & HIPAA Alignment](#security--hipaa-alignment)

---

## Core Features

- **Patient Appointment Booking**: Select healthcare facilities, departments, specific clinical services, date, and 30-minute time slots with live availability checks.
- **Dynamic Digital Tokens**: Issue structured token numbers (e.g., `CARD-101`, `PEDS-102`) based on department code and daily sequences.
- **Real-Time Queue Tracking**: Live position indicator (e.g., "3 patients ahead of you"), dynamically calculated estimated waiting time, and real-time status updates via WebSockets.
- **Real Email OTP Verification**: Automated 6-digit cryptographic verification codes dispatched through SMTP (Gmail / custom SMTP) with STARTTLS encryption, 60-second resend cooldowns, and secure SHA-256 code hashing.
- **Real Google OAuth 2.0 Integration**: Sign in with official Google Identity Services (`gsi/client`), server-side JWT signature verification (`google-auth`), and automatic account linking.
- **Hospital Admin & Staff Portal**: Comprehensive queue dashboard allowing clinical staff to call next tokens, serve, complete, mark no-shows, transfer between departments, and assign counter numbers.
- **Department & Organization Management**: Create, edit, and configure operating hours, token prefix codes, consultation slot durations, and active statuses.
- **Live Auditing**: Comprehensive audit log recording all administrative actions, token transitions, and authentication events.

---

## End-to-End System Workflows

### Workflow 1: Patient Registration & Real Email OTP Verification

```
[Patient] ────► Fills Registration Form (Name, Email, Mobile, Password)
                     │
                     ▼
[Backend] ────► Validates inputs & checks uniqueness (Email, Mobile, Username)
                     │
                     ▼
[MongoDB] ────► Stores unverified user record (email_verified: false, is_active: false)
                     │
                     ▼
[OTP Engine] ─► Generates cryptographically secure 6-digit OTP (secrets.randbelow)
                     │
                     ▼
[SMTP Service]─► Dispatches branded QueueSense verification email via STARTTLS
                     │
                     ▼
[Patient] ────► Enters 6-digit code on auto-advancing input screen
                     │
                     ▼
[Backend] ────► Verifies SHA-256 hash, expires token, activates account
                     │
                     ▼
[Session] ────► Issues JWT Access & Refresh Tokens ────► Direct to /customer Dashboard
```

1. **Input Submission**: The patient completes registration with their First Name, Last Name, Email, Username, Mandatory Mobile Number, and Password.
2. **Server-Side Validation**: FastAPI validates input schemas using Pydantic, checks uniqueness in MongoDB Atlas, and hashes the password using Argon2id.
3. **Account Creation**: The account is created with `email_verified: False` and `is_active: False`.
4. **Code Generation & Email Dispatch**: A random 6-digit OTP code is generated, hashed with SHA-256, stored with a 5-minute TTL, and sent via Gmail SMTP.
5. **Verification**: The patient inputs the 6 digits on the `/verify-email` page (with paste and numeric keypad support). On matching, the account is activated and the user receives JWT session tokens.

---

### Workflow 2: Official Google OAuth 2.0 Single Sign-On

```
[Patient] ────► Clicks "Continue with Google"
                     │
                     ▼
[Google GSI] ─► Opens Google account picker popup
                     │
                     ▼
[Google GSI] ─► Returns signed ID Token credential to React client
                     │
                     ▼
[FastAPI] ────► POST /api/auth/google { credential: ID_TOKEN }
                     │
                     ▼
[google-auth] ─► Verifies cryptographic signature against Google's public certs
                     │ Checks audience (GOOGLE_CLIENT_ID), issuer, & expiry
                     │
                     ▼
[MongoDB] ────► Resolves user via unique google_sub ID:
                     ├── User exists ────────► Returns JWT session tokens
                     └── User new ───────────► Creates verified account ──► Returns JWT
```

1. **Client Identity**: The official Google Identity Services library (`https://accounts.google.com/gsi/client`) initializes with the client's Web Client ID.
2. **Token Verification**: FastAPI verifies the token using Google's official `google.oauth2.id_token` library, validating signature, expiration, and audience.
3. **Identity Resolution**: Users are uniquely identified by their Google `sub` claim. Duplicate registrations with the same email trigger a secure password-confirmation linking flow.

---

### Workflow 3: Appointment Booking & Slot Reservation

```
[Patient] ──► Selects Organization ──► Selects Department ──► Selects Service
                   │
                   ▼
[Frontend] ─► Queries GET /api/appointments/available-slots?date=YYYY-MM-DD
                   │
                   ▼
[Backend] ──► Filters out booked slots, operating schedules, & lunch breaks
                   │
                   ▼
[Patient] ──► Selects available slot (e.g. 10:30 AM) & enters symptoms/notes
                   │
                   ▼
[Backend] ──► Creates appointment record in MongoDB with status: "confirmed"
```

1. **Service Selection**: Patients browse active clinical departments (Cardiology, Pediatrics, General Medicine, Orthopedics) and consultation services.
2. **Slot Calculation**: The backend calculates open 30-minute intervals between operating start and end hours, removing booked appointments and break periods.
3. **Confirmation**: A confirmed appointment record is created and linked to the patient's profile.

---

### Workflow 4: Digital Token Generation & Live Queue Progression

```
[Patient] ──► Clicks "Generate Digital Token" (Walk-in or from Appointment)
                   │
                   ▼
[Backend] ──► Atomic MongoDB counter increments daily sequence (e.g., #104)
                   │ Prefix is assigned from Department (e.g., "CARD-104")
                   │
                   ▼
[MongoDB] ──► Inserts token with status: "waiting" & timestamp
                   │
                   ▼
[WebSockets]─► Broadcasts updated queue length to department room
                   │
                   ▼
[Patient] ──► Views MyTicket screen:
                   • Token: CARD-104
                   • Position: 3 ahead of you
                   • Estimated Wait: 45 minutes
```

1. **Token Numbering**: Tokens use standardized formats combining department prefixes and sequential daily counters (`CARD-101`, `ORTH-102`).
2. **Dynamic Position**: Live positions are calculated by counting the number of active tokens in `waiting` or `called` status created prior to the user's token.
3. **Estimated Waiting Time**: Calculated as:
   $$\text{Estimated Wait (minutes)} = \text{Patients Ahead} \times \text{Average Service Duration (15 mins)}$$
4. **WebSocket Push**: Any queue change triggers WebSocket broadcasts, updating all connected patient screens instantaneously.

---

### Workflow 5: Clinical Counter Administration & Queue Calling

```
[Doctor/Staff] ──► Logs in to Admin Portal (/admin)
                        │
                        ▼
[Queue Desk] ──► Selects Counter # (e.g., Counter 3) & Department
                        │
                        ▼
[Actions]:
   ├── "Call Next"   ──► Atomically updates next waiting token to "called"
   │                     Broadcasts audio/visual notification via WebSocket
   ├── "Start Serve" ──► Sets token status to "serving", records start time
   ├── "Complete"    ──► Sets token status to "completed", records finish time
   ├── "No Show"     ──► Marks token "no_show" after waiting threshold
   └── "Transfer"    ──► Transfers patient to another department queue
```

1. **Counter Assignment**: Hospital administrators or clinical staff assign their physical consultation desk/counter.
2. **Atomic Token State Transitions**: All queue operations use MongoDB's atomic `find_one_and_update` to avoid race conditions when multiple staff members call patients simultaneously.
3. **Status Flow**:
   $$\text{Waiting} \longrightarrow \text{Called} \longrightarrow \text{Serving} \longrightarrow \text{Completed / No Show / Cancelled}$$

---

## Design System & Color Tokens

QueueSense adheres strictly to a clean, handcrafted healthcare SaaS design language:

| Design Token | Hex Code | Visual Application |
| :--- | :--- | :--- |
| **Header Accent** | `#234F3E` | Navigation bars, primary headings, prominent badges |
| **Primary Action** | `#88C65A` | Primary action buttons, active toggles, call-to-actions |
| **Button Hover** | `#77B34C` | Interactive hover states |
| **Page Background** | `#F4F5F7` | Soft, minimal off-white page background |
| **Card Background** | `#FFFFFF` | Form cards, queue tickets, container panels |
| **Primary Text** | `#242424` | Main headings, form inputs, ticket numbers |
| **Secondary Text** | `#777777` | Field descriptors, metadata, subheadings |
| **Subtle Borders** | `#E5E7EB` | Input borders, dividers, card outlines |

---

## Technology Stack

### Frontend
- **Framework**: React 18 / 19 with Vite 8
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Routing**: React Router DOM (v7)
- **Data Fetching**: TanStack React Query v5 & Axios
- **Real-Time Client**: Native WebSocket with auto-reconnection and heartbeats
- **Icons**: Lucide React

### Backend
- **Framework**: FastAPI (Python 3.10+)
- **ASGI Server**: Uvicorn with multi-process workers
- **Database Driver**: Motor (AsyncIO driver for MongoDB)
- **Data Validation**: Pydantic v2
- **Password Hashing**: Argon2id via `argon2-cffi`
- **Session Tokens**: JWT (`pyjwt`) with Access & Refresh token rotation
- **Email Delivery**: Python `smtplib` + `email.mime` with STARTTLS encryption
- **Google OAuth**: Official `google-auth` Python SDK

### Database
- **Engine**: MongoDB Atlas Cloud
- **Indexes**: Sparse unique indexes on `email`, `username`, `mobile`, `google_sub`
- **TTL Collections**: Automated document expiration on verification codes (`otp_verifications`)

---

## Repository Structure

```
QueueSense/
├── backend/
│   ├── api/                    # FastAPI route controllers
│   │   ├── admin.py            # Department queues, counter calling, metrics
│   │   ├── appointments.py     # Slot availability, booking, cancellations
│   │   ├── auth.py             # Register, email OTP, login, Google OAuth
│   │   ├── departments.py      # Department CRUD and service configuration
│   │   ├── organizations.py    # Clinic/Hospital facility management
│   │   ├── queue.py            # Token generation, positions, wait calculations
│   │   └── websocket.py        # Real-time WebSocket connection manager
│   ├── core/
│   │   ├── config.py           # Environment settings loader
│   │   ├── database.py         # MongoDB connection & index initialization
│   │   └── security.py         # Argon2id hashing & JWT token handlers
│   ├── middleware/
│   │   └── audit_middleware.py # Request audit logging middleware
│   ├── schemas/                # Pydantic request and response models
│   ├── services/
│   │   ├── email_service.py    # SMTP email verification dispatcher
│   │   └── otp_service.py      # Cryptographic 6-digit OTP engine
│   ├── utils/
│   │   ├── clear_db.py         # Database wipe script
│   │   └── seed_data.py        # Demo healthcare dataset seeder
│   ├── tests/                  # Pytest test suite
│   ├── main.py                 # FastAPI application entrypoint
│   └── requirements.txt        # Backend Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/         # Reusable UI widgets & Google OAuth button
│   │   ├── contexts/           # Authentication state context
│   │   ├── layouts/            # Auth, Customer, and Admin shell layouts
│   │   ├── pages/
│   │   │   ├── admin/          # Admin dashboard, queues, departments, analytics
│   │   │   ├── auth/           # Login, Register, Verify Email, Forgot Password
│   │   │   └── customer/       # Booking, MyTicket, LiveQueue, History, Profile
│   │   ├── services/           # Axios HTTP client instance
│   │   ├── App.tsx             # Route definitions & protected guards
│   │   └── main.tsx            # Vite root mount
│   ├── package.json            # Frontend npm dependencies
│   ├── vite.config.ts          # Vite build configuration
│   └── vercel.json             # Vercel SPA routing configuration
├── .gitignore                  # Git secrets & build artifact exclusion
├── requirements.txt            # Root Python dependencies for cloud buildpacks
└── README.md                   # System documentation
```

---

## Local Installation & Setup

### Prerequisites
- Python 3.10 or higher
- Node.js 18+ and npm
- A free MongoDB Atlas cluster

### 1. Clone the Repository
```bash
git clone https://github.com/Chanikya-Sanapala/Digital-Hospital-Queue-Appointment-System.git
cd Digital-Hospital-Queue-Appointment-System
```

### 2. Configure Backend Environment
Create `backend/.env` with your credentials:
```env
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/?retryWrites=true&w=majority
DATABASE_NAME=queuesense
JWT_SECRET=your_super_secret_jwt_key_at_least_32_characters_long
JWT_REFRESH_SECRET=your_super_secret_refresh_key_at_least_32_characters_long
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=7

# Email Verification (Gmail SMTP)
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your.email@gmail.com
SMTP_PASSWORD=your_16_char_gmail_app_password
SMTP_FROM_EMAIL=your.email@gmail.com
SMTP_FROM_NAME=QueueSense
SMTP_TLS=true

# Google OAuth 2.0 (Optional)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```

### 3. Start the Backend API
```powershell
# From project root
python -m pip install -r requirements.txt
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```
*API docs available at: `http://localhost:8000/docs`*

### 4. Configure Frontend Environment
Create `frontend/.env`:
```env
VITE_API_URL=http://localhost:8000/api
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

### 5. Start the React Frontend
```powershell
cd frontend
npm install
npm run dev
```
*Application available at: `http://localhost:5173`*

---

## Production Cloud Deployment Guide

### Deploying Backend to Render

1. Sign in to [Render.com](https://render.com) and click **New +** &rarr; **Web Service**.
2. Select your GitHub repository: `Digital-Hospital-Queue-Appointment-System`.
3. Set the build and start commands:
   - **Environment:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
4. Under **Environment Variables**, add:
   - `MONGODB_URI`: *Your MongoDB Atlas connection URI*
   - `DATABASE_NAME`: `queuesense`
   - `JWT_SECRET`: *A secure 64-character random string*
   - `JWT_REFRESH_SECRET`: *A secure 64-character random string*
   - `EMAIL_PROVIDER`: `smtp`
   - `SMTP_HOST`: `smtp.gmail.com`
   - `SMTP_PORT`: `587`
   - `SMTP_USERNAME`: *Your Gmail address*
   - `SMTP_PASSWORD`: *Your 16-character Gmail App Password*
   - `SMTP_FROM_EMAIL`: *Your Gmail address*
   - `SMTP_FROM_NAME`: `QueueSense`
   - `SMTP_TLS`: `true`
   - `GOOGLE_CLIENT_ID`: *Your Google Web Client ID*
5. Click **Create Web Service**. Once deployed, copy your Render URL:
   `https://queuesense-api.onrender.com`

---

### Deploying Frontend to Vercel

1. Sign in to [Vercel.com](https://vercel.com) and click **Add New...** &rarr; **Project**.
2. Import your GitHub repository.
3. Configure the project:
   - **Root Directory:** Click *Edit* and select **`frontend`**
   - **Framework Preset:** `Vite`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Add **Environment Variables**:
   - `VITE_API_URL`: `https://queuesense-api.onrender.com/api` *(your Render URL + `/api`)*
   - `VITE_GOOGLE_CLIENT_ID`: *Your Google Web Client ID*
5. Click **Deploy**. Vercel will build and assign a production domain (e.g. `https://queuesense.vercel.app`).

---

## Default Test Credentials

For evaluation and testing, you can seed pre-configured administrative accounts using:
```powershell
python -m backend.utils.seed_data
```

| Role | Email | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **Hospital Administrator** | `admin@queuesense.com` | `Password@123` | Full access to `/admin` portal, department setups, staff, queue overrides, and analytics |
| **Clinical Staff / Doctor** | `staff@queuesense.com` | `Password@123` | Counter queue desk, calling next tokens, completing consultations |
| **Registered Patient** | `patient@queuesense.com` | `Password@123` | Appointment booking, digital token generation, live queue tracking |

---

## Security & HIPAA Alignment

- **No Secrets in Frontend**: All API secret keys, database credentials, and SMTP passwords remain strictly server-side.
- **Argon2id Hashing**: Passwords hashed with high-memory, multi-lane Argon2id algorithm resistant to GPU cracking.
- **Cryptographic OTPs**: Single-use numeric tokens generated using cryptographically strong pseudo-random number generators (`secrets.randbelow`).
- **Token Rotation**: Short-lived JWT access tokens (60 minutes) combined with strictly rotated refresh tokens.
- **Audit Trails**: Non-destructive audit logs tracking user sessions, administrative privilege escalation, and token status updates.

---

## License

This project is licensed under the MIT License — feel free to use and adapt for healthcare queue modernization.
