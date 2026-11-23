# Skanda International School — Phase 1

A full-stack admissions portal and school management platform built with **React Native (Expo SDK with React Native Web)** on the frontend and **Node.js + Express + MySQL 8.0 (Prisma ORM)** on the backend. A single codebase runs seamlessly across Web, iOS, and Android, and is accessible across local Wi-Fi networks on mobile devices.

---

## Architecture & Tech Stack

* **Frontend:** React Native (Expo SDK 52, React Native Web), TypeScript
* **Backend:** Node.js, Express 5, Prisma ORM 6
* **Database:** MySQL 8.0 / 8.4 (`skanda_school`)
* **Styling & Theme:** Royal Blue (`#1D4ED8`), Deep Navy (`#1E3A8A`), Soft Sky Tint (`#DBEAFE`), Cool Off-White (`#F4F7FB`), Crisp White (`#FFFFFF`)
* **Document Generation:** `jspdf` (Client) + `pdfkit` (Server Fallback)
* **Testing:** Jest + Supertest (Backend API & DB Integration), Playwright (E2E Browser & Layout Verification)

---

## Prerequisites

Before running the project, ensure you have the following installed on your machine:

1. **Node.js** (v18.0.0 or higher, v20/v22 recommended)
2. **npm** (v9.0.0 or higher)
3. **MySQL Server 8.0 or 8.4** (running on default port `3306`)

---

## Step-by-Step Backend Configuration

### 1. Start MySQL & Create Database
Open your MySQL client (MySQL Workbench, MySQL Command Line, or Terminal) and run:

```sql
CREATE DATABASE IF NOT EXISTS skanda_school;
```

### 2. Configure Backend Environment Variables
Navigate to the `server/` directory and check or create `server/.env`:

```bash
cd server
```

Create or verify the `.env` file with the following contents:

```env
PORT=5000
DATABASE_URL="mysql://root:Admin%40123@localhost:3306/skanda_school"
JWT_SECRET="skanda_secret_jwt_key_2026_super_secure"
NODE_ENV="development"
```

> [!NOTE]
> * Replace `root` and `Admin%40123` with your MySQL username and password.
> * If your MySQL password contains special characters like `@`, URL-encode it (e.g., `@` becomes `%40`, so `Admin@123` is written as `Admin%40123`).

### 3. Install Backend Dependencies
From inside the `server/` directory:

```bash
npm install
```

### 4. Push Database Schema to MySQL (Prisma)
Sync the Prisma schema directly to your MySQL database:

```bash
npx prisma db push
npx prisma generate
```

This creates the normalized `ApplicantUser` and `Application` tables with CHAR(36) UUID primary keys, JSON columns, and indexes.

### 5. Start the Backend Server
```bash
npm start
```
*(Or from the project root: `npm run server`)*

The server automatically detects your active Wi-Fi / LAN IP and binds to `0.0.0.0:5000`:
```text
====================================================
  Skanda International School Backend Server
  Local:   http://localhost:5000
  Network: http://<YOUR_LAN_IP>:5000
  Health:  http://<YOUR_LAN_IP>:5000/api/health
====================================================
```

Verify backend health by opening `http://localhost:5000/api/health` in your browser.

---

## Step-by-Step Frontend Configuration & Startup

Open a new terminal window in the root project directory (`skanda-international-school`):

### 1. Install Frontend Dependencies
```bash
npm install
```

### 2. Start the Frontend Application
To start in Web mode:

```bash
npm run web
```

Or to start with Expo Metro for Web, iOS, and Android:

```bash
npm start
```

* **Web Browser:** Opens automatically at `http://localhost:8081` (or via LAN at `http://<YOUR_LAN_IP>:8081`).
* **Mobile Devices (Expo Go):** Open the Expo Go app on your physical iPhone or Android device on the same Wi-Fi network and scan the QR code in the terminal.

---

## Running Multi-Device / LAN Access (Mobile & Tablets)

Both the frontend and backend are configured to listen on `0.0.0.0` with dynamic CORS and automatic LAN IP resolution:

1. Ensure your computer and your phone/tablet are connected to the **same Wi-Fi network**.
2. Note your computer's LAN IP printed on backend startup (e.g., `192.168.68.105`).
3. On your phone's browser, navigate to:
   * **Frontend:** `http://192.168.68.105:8081`
   * **Backend API:** `http://192.168.68.105:5000/api/health`
4. The client-side API configuration automatically detects `window.location.hostname` on the web or `Constants.expoConfig.hostUri` on native Expo Go, routing all API calls to the matching LAN server with zero manual configuration.

---

## Running Automated Verification Test Suites

The project includes an automated test suite covering all validation rules, MySQL persistence, and browser UI layouts:

```bash
# 1. Run Backend API & MySQL Integration Tests (18 tests)
npm run test:api

# 2. Run End-to-End Browser & UI Layout Playwright Tests (4 tests)
npm run test:e2e

# 3. Run the entire verification suite
npm test
```

### Verified Test Areas:
* **Registration & Password Security:** Enforces 8+ characters, alphanumeric requirements, and 10-digit mobile validation.
* **Resume & OTP Login:** Resumes draft applications at the exact saved step with all pre-filled JSON form state.
* **Conditional Validations:** Enforces age eligibility against chosen class, conditional room type for Hostel, and conditional pickup area for Transport.
* **Mutation Locking:** Locks submitted applications (`SUBMITTED`) from further draft edits.
* **PDF Download:** Verifies client `jspdf` and server `pdfkit` official PDF generation.
* **Visual Layout:** Verifies zero-overlap bounding boxes on home ticker and cards, and absence of header button clipping.
* **Strict RBAC Sidebar:** Verifies post-enrollment portal menus (Attendance, Timetable, Homework, Exams) remain hidden until application is `ACCEPTED` or `ENROLLED`.
* **Search Command Popover:** Real-time searchable popover filtering steps, subjects, facilities, and documents.

---

## Demo / Testing Credentials

* **Dev Master OTP:** `123456` (You can also view the freshly generated 6-digit OTP in the backend terminal console logs).
* **Sample Flow:**
  1. Go to `http://localhost:8081` $\rightarrow$ Click **Apply Now** (or **Apply Online**).
  2. Click **Start New Application → Verify**.
  3. Enter Name, 10-digit mobile, email, and password (e.g. `Password123`).
  4. Verify using the logged OTP or master OTP `123456`.
  5. Progress through steps (Programme $\rightarrow$ Board $\rightarrow$ Curriculum $\rightarrow$ Details $\rightarrow$ Facilities $\rightarrow$ Documents $\rightarrow$ Submit).
  6. On submission, access the **Student Dashboard** and download the official Admission PDF (`SIS-2026-XXXX-Application.pdf`).
