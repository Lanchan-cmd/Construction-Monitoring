# Nirman — Construction Monitoring & Management System

A construction management platform for small Indian construction firms. Built as **two clients sharing one backend**:

- **Android app** (Kotlin + Jetpack Compose) — for field staff on-site
- **Web dashboard** (Vite + React + TypeScript) — for office staff and owners
- **Shared backend** (Supabase / PostgreSQL) — single database, auth, and storage

Features ₹ currency, GST percentages, India-specific location hierarchy (state/district/taluk/village/PIN), daily wage calculation, and Kannada + English language support.

> **Final-year CSE project** — uses only free and open-source technologies.

---

## Table of Contents

1. [Folder Structure](#1-folder-structure)
2. [Database Schema](#2-database-schema)
3. [ER Diagram](#3-er-diagram)
4. [Use Case Diagram](#4-use-case-diagram)
5. [System Architecture](#5-system-architecture)
6. [API Design](#6-api-design)
7. [Authentication & Security](#7-authentication--security)
8. [Installation Guide](#8-installation-guide)
9. [Testing Guide](#9-testing-guide)
10. [Deployment Guide](#10-deployment-guide)
11. [Tech Stack](#11-tech-stack)

---

## 1. Folder Structure

```
nirman/
├── android/                          # Kotlin Android app (field staff)
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── java/com/rork/nirman/
│   │   │   │   ├── Config.kt              # Auto-generated env config
│   │   │   │   ├── MainActivity.kt        # Compose entry point
│   │   │   │   ├── data/
│   │   │   │   │   ├── SupabaseClient.kt  # Supabase SDK singleton
│   │   │   │   │   ├── Models.kt          # @Serializable domain models
│   │   │   │   │   ├── AuthRepository.kt  # Auth + profile management
│   │   │   │   │   └── DataRepository.kt  # All CRUD operations
│   │   │   │   └── ui/
│   │   │   │       ├── navigation/
│   │   │   │       │   └── AppNavigation.kt   # NavHost routes
│   │   │   │       ├── theme/
│   │   │   │       │   └── Theme.kt           # Amber-on-slate Material 3
│   │   │   │       ├── util/
│   │   │   │       │   └── Format.kt          # ₹ formatting, dates, GST
│   │   │   │       ├── viewmodel/
│   │   │   │       │   └── AppViewModel.kt    # StateFlow-based state mgmt
│   │   │   │       └── screens/
│   │   │   │           ├── LoginScreen.kt
│   │   │   │           ├── DashboardScreen.kt
│   │   │   │           ├── ProjectsScreen.kt
│   │   │   │           ├── ProjectDetailScreen.kt   # Tabbed sub-modules
│   │   │   │           ├── UsersScreen.kt           # Admin only
│   │   │   │           └── SettingsScreen.kt
│   │   │   ├── res/                     # Icons, themes, strings
│   │   │   └── AndroidManifest.xml
│   │   └── build.gradle.kts
│   ├── gradle/libs.versions.toml       # Version catalog (Supabase, Ktor, etc.)
│   └── settings.gradle.kts
│
├── web/                               # React web dashboard (office staff)
│   ├── src/
│   │   ├── App.tsx                     # Router + auth guards
│   │   ├── main.tsx                    # React root
│   │   ├── index.css                   # Amber-on-slate design system
│   │   ├── lib/
│   │   │   ├── supabase.ts             # Supabase JS client
│   │   │   ├── auth.tsx                # AuthProvider + PrefsProvider
│   │   │   ├── types.ts                # TypeScript domain types
│   │   │   ├── i18n.ts                 # Kannada + English dictionary
│   │   │   └── format.ts               # ₹ formatting, GST, dates
│   │   ├── components/
│   │   │   ├── AppLayout.tsx           # Sidebar + topbar + role nav
│   │   │   ├── ui-widgets.tsx          # StatCard, StatusBadge, etc.
│   │   │   └── ui/                     # shadcn/ui component library
│   │   └── pages/
│   │       ├── LoginPage.tsx
│   │       ├── DashboardPage.tsx       # Charts + stats
│   │       ├── ProjectsPage.tsx        # Project cards + create dialog
│   │       ├── ProjectDetailPage.tsx   # 8 tabbed sub-modules
│   │       ├── CrossModulePages.tsx    # Materials, Labour, Expenses, etc.
│   │       ├── UsersPage.tsx           # Admin user management
│   │       ├── ReportsPage.tsx         # Charts + CSV/PDF export
│   │       ├── LogsPage.tsx            # System audit logs
│   │       └── SettingsPage.tsx
│   ├── package.json
│   ├── tailwind.config.ts
│   └── vite.config.ts
│
├── backend/                           # Supabase backend artifacts
│   ├── types.ts                       # Auto-generated DB types
│   └── functions/                     # Edge functions (future)
│
├── .env                               # Shared environment variables
└── rork.json                          # Project configuration
```

---

## 2. Database Schema

PostgreSQL via Supabase. 12 tables with Row Level Security (RLS).

### profiles
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | References `auth.users(id)` |
| email | TEXT | User email |
| full_name | TEXT | Display name |
| role | TEXT | `admin`, `engineer`, `contractor`, `owner`, `supervisor`, `labour` |
| phone | TEXT | Phone number |
| preferred_language | TEXT | `en` or `kn` |
| is_active | BOOLEAN | Account active flag |
| created_at / updated_at | TIMESTAMPTZ | Timestamps |

### projects
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Project ID |
| name | TEXT | Project name |
| description | TEXT | Project description |
| created_by | UUID (FK→profiles) | Creator |
| engineer_id | UUID (FK→profiles) | Assigned engineer |
| contractor_id | UUID (FK→profiles) | Assigned contractor |
| status | TEXT | `planning`, `active`, `on_hold`, `completed`, `cancelled` |
| budget | NUMERIC(14,2) | Total budget (₹) |
| budget_used | NUMERIC(14,2) | Spent amount (auto-calculated) |
| progress_percent | INT | 0–100 |
| gst_percent | NUMERIC(5,2) | GST rate |
| start_date / end_date | DATE | Timeline |
| state, district, taluk, village, pin_code | TEXT | India location hierarchy |
| latitude, longitude | NUMERIC | GPS coordinates |

### materials
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Material ID |
| project_id | UUID (FK→projects) | Project |
| name, category, unit | TEXT | Material details |
| unit_cost | NUMERIC(12,2) | Cost per unit (₹) |
| gst_percent | NUMERIC(5,2) | GST rate |
| min_stock_level | NUMERIC | Reorder threshold |

### material_requests
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Request ID |
| project_id | UUID (FK→projects) | Project |
| material_name, quantity, unit | — | Requested material |
| status | TEXT | `pending`, `approved`, `rejected`, `fulfilled` |
| requested_by, approved_by | UUID (FK→profiles) | Users |

### workers
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Worker ID |
| project_id | UUID (FK→projects) | Project |
| full_name, skill, phone | TEXT | Worker details |
| daily_wage | NUMERIC(10,2) | Daily wage (₹) |
| is_active | BOOLEAN | Active flag |

### attendance
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Record ID |
| worker_id | UUID (FK→workers) | Worker |
| project_id | UUID (FK→projects) | Project |
| date | DATE | Attendance date |
| status | TEXT | `present`, `absent`, `half_day`, `leave` |
| hours_worked, overtime_hours | NUMERIC | Work hours |

### payments
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Payment ID |
| worker_id, project_id | UUID (FK) | References |
| amount | NUMERIC(12,2) | Payment amount (₹) |
| payment_date | DATE | Date paid |
| status | TEXT | `pending`, `paid`, `partial` |
| method | TEXT | `cash`, `upi`, `bank`, `cheque` |

### expenses
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Expense ID |
| project_id | UUID (FK→projects) | Project |
| category, description | TEXT | Expense details |
| amount | NUMERIC(12,2) | Base amount (₹) |
| gst_percent, gst_amount | NUMERIC | GST breakdown |
| total_amount | NUMERIC(12,2) | Amount + GST |
| bill_image_path | TEXT | Storage path |
| expense_date | DATE | Date incurred |

### tasks
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Task ID |
| project_id | UUID (FK→projects) | Project |
| title, description | TEXT | Task details |
| status | TEXT | `todo`, `in_progress`, `review`, `done` |
| priority | TEXT | `low`, `medium`, `high`, `critical` |
| assigned_to | UUID (FK→profiles) | Assignee |
| due_date | DATE | Deadline |

### issues
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Issue ID |
| project_id | UUID (FK→projects) | Project |
| title, description | TEXT | Issue details |
| severity | TEXT | `low`, `medium`, `high`, `critical` |
| status | TEXT | `open`, `in_progress`, `resolved`, `closed` |
| photo_path | TEXT | Issue photo |

### daily_progress
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Log ID |
| project_id | UUID (FK→projects) | Project |
| log_date | DATE | Log date (unique per project) |
| work_description | TEXT | Work done |
| progress_percent | INT | 0–100 |
| labour_count | INT | Workers on site |
| hours_worked | NUMERIC | Hours |
| weather_note | TEXT | Weather conditions |

### photos
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Photo ID |
| project_id | UUID (FK→projects) | Project |
| storage_path | TEXT | Supabase Storage path |
| public_url | TEXT | Public URL |
| caption | TEXT | Caption |
| photo_type | TEXT | `site`, `inspection`, `bill`, `issue`, `progress` |

### system_logs
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Log ID |
| actor_id | UUID (FK→profiles) | User who acted |
| action | TEXT | Action performed |
| entity_type, entity_id | — | Affected entity |
| details | JSONB | Additional data |
| created_at | TIMESTAMPTZ | Timestamp |

---

## 3. ER Diagram

```
auth.users (Supabase)
    │ 1:1
    ▼
profiles ──────────────────┐
    │                       │
    │ 1:N                   │ 1:N
    ▼                       ▼
projects ──────────── project_assignments
    │
    ├── 1:N ── materials ── 1:N ── inventory
    ├── 1:N ── material_requests
    ├── 1:N ── workers ── 1:N ── attendance
    │                     └── 1:N ── payments
    ├── 1:N ── expenses
    ├── 1:N ── tasks
    ├── 1:N ── issues
    ├── 1:N ── daily_progress
    └── 1:N ── photos

system_logs (references profiles.actor_id)

Relationships:
  profiles 1:N projects (created_by, engineer_id, contractor_id)
  projects 1:N materials, workers, expenses, tasks, issues, daily_progress, photos
  workers 1:N attendance, payments
  materials 1:N inventory
```

---

## 4. Use Case Diagram

```
                    ┌─────────────────────────────────────────┐
                    │            NIRMAN SYSTEM                 │
                    │                                         │
  ┌──────┐  ─────►  │  Manage Users  │  Manage Projects       │
  │ Admin│          │  Assign Engr   │  Approve Contractors   │
  └──────┘          │  View Dashboard│  View System Logs      │
                    │  View Reports  │                        │
                    ├────────────────┼────────────────────────┤
  ┌─────────┐  ───► │  Create Project│  Assign Contractor     │
  │Engineer │       │  Material Appr │  Daily Inspection      │
  └─────────┘       │  Upload Photos │  Progress Reports      │
                    │  Generate PDF  │  Quality Checklist     │
                    ├────────────────┼────────────────────────┤
  ┌──────────┐  ──► │  Daily Progress│  Labour Attendance     │
  │Contractor│      │  Expense Entry │  Material Request      │
  └──────────┘      │  Upload Bills  │  Work Logs             │
                    └─────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │  Shared Modules:   │
                    │  Tasks, Issues,    │
                    │  Photos, Settings  │
                    └───────────────────┘
```

---

## 5. System Architecture

```
┌───────────────────────────────────────────────────┐
│                   CLIENTS                         │
│                                                   │
│  ┌─────────────┐         ┌──────────────────┐    │
│  │  Android App │         │  Web Dashboard   │    │
│  │  (Kotlin +   │         │  (Vite + React + │    │
│  │   Compose)   │         │   Tailwind)      │    │
│  │              │         │                  │    │
│  │  Field staff │         │  Office staff    │    │
│  │  On-site     │         │  Desktop/tablet  │    │
│  └──────┬───────┘         └────────┬─────────┘    │
│         │                          │               │
└─────────┼──────────────────────────┼──────────────┘
          │  HTTPS (JWT bearer)      │
          │                          │
┌─────────┼──────────────────────────┼──────────────┐
│         ▼          ▼               │               │
│    ┌────────────────────────────┐  │   SUPABASE    │
│    │   Supabase Auto-Gen API    │  │   (Backend)   │
│    │   (PostgREST + Auth)       │  │               │
│    └────────────┬───────────────┘  │               │
│                 │                  │               │
│    ┌────────────▼───────────────┐  │               │
│    │   PostgreSQL Database      │  │               │
│    │   (12 tables + RLS)        │  │               │
│    └────────────┬───────────────┘  │               │
│                 │                  │               │
│    ┌────────────▼───────────────┐  │               │
│    │   Supabase Storage         │  │               │
│    │   (site-photos bucket)     │  │               │
│    └────────────────────────────┘  │               │
└───────────────────────────────────────────────────┘
```

**Three-tier architecture:**
1. **Presentation tier** — Android (Compose) + Web (React) — role-gated UI
2. **Application tier** — Supabase PostgREST auto-generated REST API + RLS policies
3. **Data tier** — PostgreSQL with Row Level Security enforcing role-based access

---

## 6. API Design

Supabase auto-generates a REST API from the database schema. All endpoints are at `https://<project-ref>.supabase.co/rest/v1/`.

### Auth Endpoints (Supabase Auth)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/auth/v1/signup` | Register with email/password |
| POST | `/auth/v1/token?grant_type=password` | Sign in |
| POST | `/auth/v1/logout` | Sign out |
| GET | `/auth/v1/user` | Get current user |

### Data Endpoints (PostgREST — auto-generated)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/rest/v1/projects?select=*` | List projects |
| POST | `/rest/v1/projects` | Create project |
| PATCH | `/rest/v1/projects?id=eq.<uuid>` | Update project |
| GET | `/rest/v1/materials?project_id=eq.<uuid>` | List materials |
| POST | `/rest/v1/materials` | Add material |
| GET | `/rest/v1/workers?project_id=eq.<uuid>` | List workers |
| POST | `/rest/v1/attendance` | Mark attendance |
| GET | `/rest/v1/expenses?project_id=eq.<uuid>` | List expenses |
| POST | `/rest/v1/expenses` | Add expense |
| GET | `/rest/v1/tasks?project_id=eq.<uuid>` | List tasks |
| PATCH | `/rest/v1/tasks?id=eq.<uuid>` | Update task status |
| GET | `/rest/v1/issues?project_id=eq.<uuid>` | List issues |
| POST | `/rest/v1/daily_progress` | Add progress log |
| GET | `/rest/v1/photos?project_id=eq.<uuid>` | List photos |
| POST | `/rest/v1/profiles` | Create profile (trigger) |

### Storage Endpoints
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/storage/v1/object/site-photos/<path>` | Upload photo |
| GET | `/storage/v1/object/public/site-photos/<path>` | Public URL |

All data requests require `Authorization: Bearer <JWT>` and `apikey: <anon-key>` headers. RLS policies enforce role-based access at the database level.

---

## 7. Authentication & Security

### Auth Model
- **Native Supabase Auth** (email/password)
- Passwords hashed with **bcrypt** (handled by Supabase)
- Sessions via **JWT** (short-lived access token + refresh token)
- Auto-created `profiles` row via database trigger on signup

### Role-Based Access Control (RBAC)
Roles stored in `profiles.role`: `admin`, `engineer`, `contractor`, `owner`, `supervisor`, `labour`.

**RLS policies enforce:**
- **Admin:** full CRUD on all tables
- **Engineer:** create/edit projects, approve material requests, manage materials/workers
- **Contractor:** mark attendance, add expenses, request materials, add daily progress
- **All authenticated users:** read access to project data

### Security Measures
- ✅ JWT authentication on every request
- ✅ bcrypt password hashing (Supabase managed)
- ✅ Row Level Security on all 12 tables
- ✅ Input validation via database CHECK constraints
- ✅ `SECURITY DEFINER` on trigger functions with scoped `search_path`
- ✅ Storage bucket policies (authenticated upload, public read)
- ✅ No hardcoded secrets — credentials in environment variables

---

## 8. Installation Guide

### Prerequisites
- **Node.js** 18+ and **Bun** (for web app)
- **Android Studio** with JDK 11+ (for Android app)
- **Git**
- A **Supabase** account (free tier at supabase.com)

### Step 1: Clone the Repository
```bash
git clone <your-repo-url> nirman
cd nirman
```

### Step 2: Set Up Supabase Backend
1. Create a new project at [supabase.com](https://supabase.com)
2. Get your **Project URL** and **anon key** from Settings → API
3. Add to `.env`:
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```
4. Run the SQL migrations (in Supabase SQL Editor, in order):
   - Migration 1: `create-profiles-and-projects`
   - Migration 2: `create-materials-and-inventory`
   - Migration 3: `create-workers-attendance-payroll`
   - Migration 4: `create-expenses-equipment-tasks-issues`
   - Migration 5: `create-daily-progress-and-photos`
5. Create the storage bucket: `site-photos` (public)

### Step 3: Run the Web Dashboard
```bash
cd web
bun install
bun run dev
```
Open `http://localhost:8080`

### Step 4: Run the Android App
```bash
cd android
# Open in Android Studio or build via Gradle:
./gradlew assembleDebug
# Install on device/emulator:
./gradlew installDebug
```

### Step 5: Create Your First Admin User
1. Open the web dashboard or Android app
2. Sign up with email/password
3. Select "Admin" role
4. Confirm email (check inbox)
5. Sign in — you're now the admin

---

## 9. Testing Guide

### Web Dashboard
```bash
cd web
bun run test          # Run unit tests
bun run test:browser  # Run browser tests
bun run lint          # ESLint checks
bun run build         # TypeScript + production build
```

### Android App
```bash
cd android
./gradlew test              # Unit tests
./gradlew connectedCheck    # Instrumented tests (requires emulator)
./gradlew assembleDebug     # Build verification
```

### Manual Testing Checklist
- [ ] Sign up as Admin, Engineer, and Contractor
- [ ] Create a project with India location fields
- [ ] Add materials and workers
- [ ] Mark attendance for a worker
- [ ] Add an expense with GST calculation
- [ ] Create a task and move it across statuses
- [ ] Report an issue and resolve it
- [ ] Add daily progress (verify project % updates)
- [ ] Upload a photo
- [ ] View dashboard charts
- [ ] Generate CSV export from Reports
- [ ] Switch language to Kannada
- [ ] Toggle dark mode
- [ ] Admin: manage users (change role, toggle active)

---

## 10. Deployment Guide

### Web Dashboard Deployment
The web app builds to static files deployable to any free static host:

```bash
cd web
bun run build    # Outputs to dist/
```

**Deploy options (all free):**
- **Vercel:** `vercel --prod` (connect repo for auto-deploy)
- **Netlify:** drag-and-drop `dist/` folder
- **GitHub Pages:** push `dist/` to `gh-pages` branch
- **Cloudflare Pages:** connect repo, build command `bun run build`, output `dist`

### Android App Deployment
```bash
cd android
./gradlew assembleRelease    # Generates app-release.apk
```

The APK is at `android/app/build/outputs/apk/release/app-release.apk`.

**Google Play Store:**
1. Create a Play Console account ($25 one-time fee)
2. Generate a signed AAB: `./gradlew bundleRelease`
3. Upload `.aab` to Play Console
4. Fill in store listing, screenshots, and privacy policy
5. Submit for review

**Direct APK distribution (free):**
- Share the APK directly with users for sideloading
- Host on GitHub Releases

### Supabase Backend
The backend is already hosted on Supabase's free tier — no additional deployment needed. The free tier includes:
- 500MB database
- 1GB file storage
- 50,000 monthly active users
- Unlimited API requests

---

## 11. Tech Stack

| Layer | Technology | Cost |
|-------|-----------|------|
| Android UI | Kotlin + Jetpack Compose + Material 3 | Free |
| Web UI | Vite + React + TypeScript + Tailwind | Free |
| Web Components | shadcn/ui (Radix UI) | Free |
| Charts (Web) | Recharts | Free |
| Backend | Supabase (PostgreSQL + Auth + Storage) | Free tier |
| Database | PostgreSQL via Supabase | Free tier |
| Auth | Supabase Auth (JWT + bcrypt) | Free |
| Image Storage | Supabase Storage | Free tier |
| Maps | OpenStreetMap + Leaflet | Free |
| State (Web) | TanStack React Query | Free |
| State (Android) | StateFlow + ViewModel | Free |
| Networking (Android) | Ktor + Supabase Kotlin SDK | Free |
| Icons | Lucide (Web) + Material Icons (Android) | Free |
| Version Control | Git + GitHub | Free |
| IDE | VS Code / Android Studio | Free |

**All technologies are free and open-source.** No paid APIs, premium libraries, or subscriptions required.

---

## User Roles & Permissions

| Capability | Admin | Engineer | Contractor |
|-----------|-------|----------|------------|
| View dashboard | ✅ | ✅ | ✅ |
| Create/edit projects | ✅ | ✅ | ❌ |
| Assign engineer/contractor | ✅ | ✅ | ❌ |
| Manage users | ✅ | ❌ | ❌ |
| View system logs | ✅ | ❌ | ❌ |
| Add materials | ✅ | ✅ | ✅ (edit) |
| Approve material requests | ✅ | ✅ | ❌ |
| Add workers | ✅ | ✅ | ✅ |
| Mark attendance | ✅ | ✅ | ✅ |
| Add expenses | ✅ | ✅ | ✅ |
| Add daily progress | ✅ | ✅ | ✅ |
| Create tasks | ✅ | ✅ | ✅ |
| Report issues | ✅ | ✅ | ✅ |
| Upload photos | ✅ | ✅ | ✅ |
| View reports | ✅ | ✅ | ❌ |

---

## India-Specific Features

- **₹ Currency:** Indian rupee formatting with Indian digit grouping (₹12,50,000.00)
- **GST:** Percentage tracking on projects, materials, and expenses with automatic GST amount calculation
- **Location Hierarchy:** State → District → Taluk → Village → PIN Code
- **Indian States:** Dropdown includes all major states (Karnataka, Tamil Nadu, Maharashtra, etc.)
- **Daily Wage:** Worker daily wage in ₹ with attendance-based calculation
- **Kannada + English:** Full bilingual support via i18n dictionary (web) and string resources (Android)

---

## License

This project is built as a final-year Computer Science Engineering project. All code is provided for educational use.

---

© 2026 Nirman — Construction Monitoring & Management System
