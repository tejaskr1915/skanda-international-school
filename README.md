# Skanda International School — Phase 1 Admissions Portal

A full-stack admissions portal and campus showcase platform built with **React Native (Expo SDK 52 with React Native Web)** on the frontend and **Node.js + Express 5 + MySQL 8.0 (Prisma ORM)** on the backend. Designed with a **Royal Blue (`#1D4ED8`) & Crisp White (`#FFFFFF`)** design system, a single codebase runs seamlessly across Web, iOS, and Android, and is accessible across local Wi-Fi networks on mobile devices.

---

## Project Overview & Tech Stack

### Phase 1 Core Features
1. **Public Website & Campus Showcase:**
   - Auto-rotating 4-slide Hero Carousel with dynamic photography (`Smart Classroom`, `Central Library`, `Annual Sports Meet`, `Annual Cultural Gala`).
   - Interactive **Campuses Geo-Locator** (Kanakapura Main, Whitefield, Mysuru, Mangaluru) with state/city/programme filtering and live search.
   - Categorized **Campus Life & Gallery** (`All`, `Academics & Smart Classrooms`, `Early Years & Play`, `Sports & Athletics`, `Cultural Gala & Events`) with an interactive full-screen Lightbox modal.
   - **News & Events**, **About**, and **Contact** sections with active scroll-spy navigation.
2. **OTP-Verified Student Registration & Login:**
   - Mobile/email registration and OTP verification (with development OTP logging in the server terminal).
   - Dual-mode login modal (Password or Mobile OTP) with session persistence.
3. **Gated 9-Step Online Admission Funnel (`/apply` & `/apply/step/:stepNumber`):**
   - Step-by-step auto-saving to MySQL with resume guard (blocks dashboard access while `DRAFT`, locks back-navigation and wizard mutations once `SUBMITTED`).
   - Dynamic Board/Specialization dropdowns, interactive DOB calendar picker with live age-eligibility checks, strict 10-digit emergency contact validation, and **Skip for Nursery / Pre-Primary** support.
4. **Submitted Application Dashboard & PDF Summary (`/student/dashboard`):**
   - Real-time application status tracker (`SUBMITTED`, `UNDER_REVIEW`, `ACCEPTED`, `ENROLLED`) and printable official PDF generation (`jspdf` client + `pdfkit` server fallback).

### Tech Stack
- **Frontend:** React Native `0.76.7`, Expo SDK `52`, React Native Web `~0.19.13`, TypeScript
- **Backend:** Node.js, Express `5`, Prisma ORM `6.19.3`, JWT (`jsonwebtoken`), `bcryptjs`, `zod`, `multer`
- **Database:** MySQL `8.0` / `8.4` (`skanda_school`)
- **PDF Generation:** `jspdf` (Frontend) + `pdfkit` (Backend API)
- **Testing:** Jest + Supertest (Backend API & DB Integration), Playwright (E2E Browser & Layout Verification)

---

## Exact Folder Structure

```text
skanda-international-school/
├── .env.example                 # Root environment template
├── .gitignore                   # Git ignore rules (tracks app/assets/, prisma/, .env.example)
├── App.tsx                      # Root router, global responsive CSS & micro-animations
├── app.json                     # Expo application configuration
├── index.js                     # Expo entry point
├── package.json                 # Root scripts (setup, dev, seed, test:api, test:e2e)
├── playwright.config.js         # Playwright E2E test configuration
├── tsconfig.json                # TypeScript configuration
├── README.md                    # Project documentation
│
├── app/                         # Frontend UI, state, assets & screens
│   ├── .env.example             # Frontend environment template
│   ├── assets/
│   │   └── images/              # Tracked local images (logo, campuses, news, about)
│   │       ├── index.ts         # Centralized type-safe image exports
│   │       └── gallery/         # 7 tracked Campus Life & Gallery photos
│   ├── components/              # Reusable UI (PublicHeader, StudentHeader, GallerySection, LoginModal, StatusModal, CurriculumModal, SchoolLogoBadge, etc.)
│   ├── config/                  # API URL & environment config
│   ├── context/                 # AuthContext (JWT, application state, route navigation)
│   ├── screens/                 # HomeScreen, GalleryScreen, ApplyLandingScreen, AdmissionWizardScreen, StudentDashboardScreen
│   ├── services/                # Axios/fetch API client
│   ├── theme/                   # Royal Blue & Crisp White design tokens & Platform.select shadows
│   └── utils/                   # Client-side PDF generator & helpers
│
├── assets/                      # Expo splash/icon assets
│
├── prisma/                      # Root Prisma schema & seed script
│   ├── schema.prisma            # MySQL database schema (ApplicantUser, Application)
│   └── seed.js                  # Seeds campuses, boards, and demo applicant SKD-2026-00001
│
├── scripts/
│   └── ensure-env.js            # Auto-copies .env.example -> .env if missing on fresh pull
│
├── server/                      # Node.js + Express backend API
│   ├── .env.example             # Backend environment template (PORT, DATABASE_URL, JWT_SECRET)
│   ├── package.json             # Backend dependencies & scripts
│   ├── prisma/
│   │   ├── schema.prisma        # Server Prisma schema
│   │   └── seed.js              # Server Prisma seed script
│   ├── src/
│   │   ├── index.js             # Express app, CORS (localhost + LAN IPs), static dist serving
│   │   ├── server.js            # Server entrypoint
│   │   ├── routes/              # authRoutes.js, applicationRoutes.js
│   │   └── utils/               # academicData.js, validation helpers
│   ├── tests/
│   │   └── phase1.test.js       # 20 Jest + Supertest API integration tests
│   └── uploads/                 # Local uploaded documents (gitignored)
│
└── tests/
    └── e2e/
        └── phase1.spec.js       # 6 Playwright E2E browser & responsive layout tests
```

---

## Step-by-Step First-Time Setup & Startup

### Prerequisites
Before starting, ensure you have installed:
1. **Node.js LTS** (v18+, v20 or v22 recommended) & **npm** (v9+)
2. **MySQL Server 8.0 or 8.4** running on port `3306`
3. **Git**

### 1. Create the MySQL Database
Open your MySQL client (MySQL Workbench or CLI) and run:
```sql
CREATE DATABASE IF NOT EXISTS skanda_school;
```

### 2. Quick One-Command Setup (Recommended)
From the **root** directory (`skanda-international-school/`):

```bash
npm run setup
```
This single command automatically:
1. Copies `.env.example` to `.env` in root, `server/`, and `app/` if missing (`scripts/ensure-env.js`).
2. Installs both frontend and backend dependencies (`npm install` & `npm --prefix server install`).
3. Generates Prisma Client (`npx prisma generate`).
4. Pushes the schema to MySQL (`npx prisma db push`).
5. Seeds default campuses, boards, and demo applicant (`node prisma/seed.js`).

Then start **both** the MySQL API server and the Expo/Web UI with `--clear` cache on your local Wi-Fi IP:
```bash
npm run dev
```

---

### Manual Step-by-Step Setup (Alternative)

#### Backend (`server/`)
```bash
cd server
npm install
```
Ensure `server/.env` contains:
```env
PORT=5000
HOST=0.0.0.0
DATABASE_URL="mysql://root:Admin%40123@localhost:3306/skanda_school"
JWT_SECRET="skanda_secret_jwt_key_2026_super_secure"
NODE_ENV="development"
```
> [!NOTE]
> * Replace `root` and `Admin%40123` with your MySQL credentials.
> * URL-encode special characters in passwords (e.g., `@` becomes `%40`).

Sync Prisma and seed the database:
```bash
npx prisma generate
npx prisma db push
npm run seed
npm start
```

#### Frontend (`app/` / Root Expo Workspace)
Open a new terminal in the project root:
```bash
npm install
npx expo install --check
npx expo start --web --lan --clear
```

---

## Post-`git pull` Update Checklist (For Teammates)

Whenever you pull new changes from Git, run these steps to stay synchronized:

1. **Install any newly added packages & sync Prisma:**
   ```bash
   npm run setup
   ```
   *(Or manually run `npm install`, `npm --prefix server install`, `npx prisma generate && npx prisma db push`, and `node prisma/seed.js`)*
2. **Start with cleared Metro cache:**
   ```bash
   npm run dev
   ```
3. **Hard-refresh your browser** (`Ctrl + Shift + R` on Windows/Linux or `Cmd + Shift + R` on macOS) so stale cached JS bundles or assets are cleared.

---

## Local Wi-Fi Network Access & Troubleshooting

### Accessing from Phones & Other Laptops on the Same Wi-Fi
Both the Express backend (`0.0.0.0:5000`) and Expo (`--lan`) bind to your machine's active LAN/Wi-Fi IP address:
```text
====================================================
  Skanda International School Backend Server
  Local:   http://localhost:5000
  Network: http://<YOUR_WIFI_IP>:5000
  Health:  http://<YOUR_WIFI_IP>:5000/api/health
====================================================
```
- **Web UI on another device:** Open `http://<YOUR_WIFI_IP>:8081` (or `:5000` if serving exported `dist/`).
- **Expo Go on iOS/Android:** Connect your phone to the same Wi-Fi network and scan the QR code in the terminal.
- **CORS:** `server/src/index.js` automatically allows `localhost`, `127.0.0.1`, and private LAN IPv4 ranges (`192.168.x.x`, `10.x.x.x`, `172.16-31.x.x`).

### Windows / macOS Firewall
If another device on your Wi-Fi cannot connect to `http://<YOUR_WIFI_IP>:5000` or `:8081`:
- **Windows:** Allow Node.js through Windows Defender Firewall for **Private Networks**, or open inbound TCP ports `5000` and `8081` in Windows Firewall Advanced Security.
- **macOS:** Go to **System Settings → Network → Firewall → Options** and ensure Node / incoming connections are allowed.

### Viewing Development OTPs
In development mode, OTP codes are not sent via paid SMS gateways—instead, they are printed directly in the **backend server terminal**:
```text
======================================================
[DEV OTP SENT] Mobile: 9876543210 | OTP: 482910
======================================================
```

---

## Running Automated Tests

Ensure MySQL is running before executing tests:
```bash
# 1. Backend API & Prisma Integration Tests (20 tests)
npm run test:api

# 2. Export production Web bundle & run Playwright E2E Tests (6 tests)
npx expo export --platform web
npm run test:e2e
```
