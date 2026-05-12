# 🚚 DHL AI-Powered Knowledge Base System

![DHL](https://img.shields.io/badge/DHL-Knowledge%20Base-D40511?style=for-the-badge&logo=data:image/png;base64,iVBORw0KGgo=)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=nodedotjs)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase)
![UiPath](https://img.shields.io/badge/UiPath-RPA-FA4616?style=for-the-badge)
![Gemini](https://img.shields.io/badge/Google-Gemini%20AI-4285F4?style=for-the-badge&logo=google)

> An AI-powered web application that automates the transformation of raw, unstructured DHL logistics content into clean, structured Standard Operating Procedures (SOPs) and Knowledge Base articles — integrated with UiPath RPA for automated file ingestion from Google Drive.

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [System Architecture](#-system-architecture)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Environment Variables](#-environment-variables)
- [Database Setup](#-database-setup)
- [Running the System](#-running-the-system)
- [UiPath RPA Setup](#-uipath-rpa-setup)
- [User Roles](#-user-roles)
- [API Endpoints](#-api-endpoints)
- [Project Structure](#-project-structure)

---

## 🌟 Overview

DHL operations teams constantly generate information through chat messages, emails, screenshots, and documents — but this knowledge remains unstructured and scattered. This system solves the problem by:

- **Automatically ingesting** files from Google Drive using UiPath RPA
- **Structuring content** with Google Gemini AI (title, summary, steps, tags)
- **Managing a review workflow** — Draft → Reviewed → Published
- **Detecting conflicts** with existing published articles
- **Notifying admins** via email after each RPA run

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔐 Role-Based Auth | Admin, Editor, Reviewer with JWT authentication |
| 📤 Upload Console | Drag & drop PDF, DOCX, TXT, PNG, JPG |
| 🤖 AI Processing | Google Gemini 2.5 Flash structures raw content automatically |
| 📋 Article Lifecycle | Draft → Reviewed → Published with full version history |
| 🔍 Knowledge Base Viewer | Search and filter by status, tag, creator, date |
| ⚠️ Conflict Detection | Flags articles that overlap with existing published content |
| 📎 File Attachments | Original source files stored and linked to articles |
| 🤖 RPA Automation | UiPath ingests Google Drive files automatically |
| 📧 Email Notifications | Admin receives HTML summary email after each RPA run |
| 🛡️ Duplicate Detection | MD5 hash prevents re-processing files within 14 days |

---

## 🛠️ Tech Stack

### Frontend
- **React 18** + Vite
- **React Router DOM** v6
- **Axios** for HTTP requests
- **React Dropzone** for file upload

### Backend
- **Node.js** + Express.js
- **JWT** + bcryptjs for authentication
- **Multer** for file handling
- **pdf-parse** + **mammoth** for document parsing
- **Nodemailer** for email
- **@google/generative-ai** for Gemini AI

### Database
- **Supabase** (PostgreSQL + Storage)

### RPA
- **UiPath Studio** (VB.NET Invoke Code activities)
- Google Drive API v3

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────┐
│           FRONTEND (React + Vite)               │
│  Login │ Dashboard │ Upload │ Viewer │ Editor   │
└─────────────────┬───────────────────────────────┘
                  │ REST API (JWT Auth)
┌─────────────────▼───────────────────────────────┐
│           BACKEND (Node.js + Express)           │
│  /auth  │ /articles │ /upload │ /ai │ /rpa      │
└──────┬──────────────────────────┬───────────────┘
       │ supabase-js              │ Gemini API
┌──────▼──────────┐    ┌──────────▼──────────────┐
│    SUPABASE     │    │   GOOGLE GEMINI 2.5     │
│  PostgreSQL     │    │   Text + Vision AI      │
│  + Storage      │    └─────────────────────────┘
└─────────────────┘
┌─────────────────────────────────────────────────┐
│           UiPath RPA                            │
│  Watch Drive → Download → POST /rpa/ingest      │
│  Try/Catch → Screenshot → Log → Email Summary   │
└─────────────────────────────────────────────────┘
```

---

## ✅ Prerequisites

Make sure you have the following installed:

- [Node.js](https://nodejs.org/) v18 or higher
- [VS Code](https://code.visualstudio.com/)
- [UiPath Studio](https://www.uipath.com/) (Community Edition)
- Google Chrome or Microsoft Edge

---

## 🚀 Installation

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/dhl-kb-system.git
cd dhl-kb-system
```

### 2. Install backend dependencies

```bash
cd backend
npm install
```

### 3. Install frontend dependencies

```bash
cd ../frontend
npm install
```

---

## 🔑 Environment Variables

Create a `.env` file inside the `backend/` folder:

```env
# Supabase
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key_here

# JWT
JWT_SECRET=your_super_secret_jwt_key_here

# Google Gemini AI
GEMINI_API_KEY=AIzaSy_your_gemini_key_here

# Gmail (use App Password, NOT your real password)
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_16char_app_password

# Admin email to receive RPA summary
ADMIN_EMAIL=admin@gmail.com

# RPA Authentication
RPA_API_KEY=dhl-rpa-secret-2024

# RPA Bot user ID (get from Supabase after creating RPA user)
RPA_USER_ID=uuid-from-supabase
```

### How to get each value:

| Variable | Where to get it |
|---|---|
| `SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `SUPABASE_SERVICE_KEY` | Supabase → Settings → API → service_role key |
| `JWT_SECRET` | Any random long string |
| `GEMINI_API_KEY` | [aistudio.google.com](https://aistudio.google.com) → Get API Key |
| `EMAIL_PASS` | Google Account → Security → App Passwords (16 chars) |
| `RPA_USER_ID` | Run SQL below after database setup |

---

## 🗄️ Database Setup

### 1. Create Supabase project
Go to [supabase.com](https://supabase.com) → New Project

### 2. Run this SQL in Supabase SQL Editor

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  role TEXT CHECK (role IN ('editor', 'reviewer', 'admin')) DEFAULT 'editor',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Articles table
CREATE TABLE articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  summary TEXT,
  steps JSONB,
  tags TEXT[],
  status TEXT CHECK (status IN ('draft', 'reviewed', 'published')) DEFAULT 'draft',
  created_by UUID REFERENCES users(id),
  reviewed_by UUID REFERENCES users(id),
  published_by UUID REFERENCES users(id),
  conflict_flag BOOLEAN DEFAULT FALSE,
  conflict_note TEXT,
  raw_input TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Version history
CREATE TABLE article_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  title TEXT,
  summary TEXT,
  steps JSONB,
  tags TEXT[],
  status TEXT,
  changed_by UUID REFERENCES users(id),
  change_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- File attachments
CREATE TABLE attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RPA ingestion log (duplicate detection)
CREATE TABLE ingestion_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_hash TEXT NOT NULL,
  file_name TEXT,
  source TEXT,
  status TEXT CHECK (status IN ('created', 'duplicate', 'failed')) DEFAULT 'created',
  article_id UUID REFERENCES articles(id),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RPA run logs
CREATE TABLE rpa_run_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at TIMESTAMPTZ DEFAULT NOW(),
  total_files INTEGER DEFAULT 0,
  created_count INTEGER DEFAULT 0,
  updated_count INTEGER DEFAULT 0,
  duplicate_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  log_text TEXT,
  screenshot_url TEXT
);
```

### 3. Create RPA Bot user

```sql
INSERT INTO users (email, password_hash, full_name, role)
VALUES ('rpa@dhl.com', 'rpa-no-login', 'RPA Bot', 'editor');

-- Copy this UUID to RPA_USER_ID in your .env
SELECT id FROM users WHERE email = 'rpa@dhl.com';
```

### 4. Create Storage bucket

Supabase → Storage → New Bucket → Name: `attachments` → Toggle **Public ON** → Save

---

## ▶️ Running the System

### Start the Backend

```bash
cd backend
node server.js
```

✅ You should see: `Server running on http://localhost:5000`

Verify by opening: [http://localhost:5000](http://localhost:5000)
Expected response: `{"status":"DHL KB API running"}`

### Start the Frontend

Open a **second terminal**:

```bash
cd frontend
npm run dev
```

✅ You should see: `Local: http://localhost:5173`

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Create your first Admin account

1. Click **Sign Up**
2. Enter your full name, email, and password (min 6 chars)
3. Select **Admin** from the Role dropdown
4. Click **Create Account**
5. Switch to **Login** tab and log in

---

## 🤖 UiPath RPA Setup

### 1. Open the project
UiPath Studio → Open → navigate to the `rpa/` folder → open project

### 2. Install packages
Manage Packages → search and install `UiPath.WebAPI.Activities`

### 3. Configure Variables
In `Main.xaml` Variables panel, set:

| Variable | Value |
|---|---|
| `backendUrl` | `"http://localhost:5000/api"` |
| `rpaApiKey` | `"dhl-rpa-secret-2024"` |
| `gDriveApiKey` | Your Google Drive API key |
| `gDriveFolderId` | Your Google Drive folder ID |

### How to get Google Drive credentials:
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Enable **Google Drive API**
3. Credentials → Create API Key → copy it
4. Open your Drive folder → copy the ID from the URL

### 4. Run the workflow
1. Make sure backend is running (`node server.js`)
2. Place files (TXT, DOCX, PDF, JPG, PNG) in your Google Drive folder
3. Press **F5** in UiPath Studio
4. Check `C:\RPA_Logs\dhl_kb_log.txt` for results
5. Check admin email for the summary report
6. Open [http://localhost:5173/viewer](http://localhost:5173/viewer) to see new articles

---

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/auth/register` | Create new account | None |
| POST | `/api/auth/login` | Login, get JWT token | None |
| GET | `/api/auth/users` | List all users | JWT |

### Articles
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/api/articles` | List articles (filter: status, tag, creator, search) | JWT |
| POST | `/api/articles` | Create new draft | JWT |
| GET | `/api/articles/:id` | Get article + version history | JWT |
| PUT | `/api/articles/:id` | Update article | JWT |
| DELETE | `/api/articles/:id` | Delete article | JWT |
| GET | `/api/articles/:id/attachments` | Get file attachments | JWT |

### Upload & AI
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/upload` | Upload file, extract text | JWT |
| POST | `/api/ai/generate` | Generate structured article with Gemini | JWT |

### RPA
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/rpa/ingest` | Ingest file from RPA, AI process, create draft | x-rpa-key |
| POST | `/api/rpa/log` | Save run summary, send admin email | x-rpa-key |

---

## 📁 Project Structure

```
dhl-kb-system/
├── backend/
│   ├── server.js              # Express app entry point
│   ├── .env                   # Environment variables (not committed)
│   ├── middleware/
│   │   └── authMiddleware.js  # JWT verification
│   └── routes/
│       ├── auth.js            # Login, register, users
│       ├── articles.js        # CRUD + version history
│       ├── upload.js          # File upload + text extraction
│       ├── ai.js              # Gemini AI integration
│       └── rpa.js             # RPA ingest + email summary
├── frontend/
│   ├── src/
│   │   ├── App.jsx            # Routes definition
│   │   ├── main.jsx           # React entry point
│   │   ├── index.css          # Global styles
│   │   ├── pages/
│   │   │   ├── Login.jsx      # Login + signup
│   │   │   ├── Dashboard.jsx  # Stats + recent articles
│   │   │   ├── UploadConsole.jsx  # File upload + AI process
│   │   │   ├── DraftBuilder.jsx   # Article viewer
│   │   │   ├── EditArticle.jsx    # Article editor
│   │   │   └── ViewerPage.jsx     # KB search + filter
│   │   └── components/
│   │       └── Navbar.jsx     # Navigation bar
│   └── package.json
├── rpa/
│   └── Main.xaml              # UiPath workflow
├── .gitignore
└── README.md
```

---

## ⚠️ Troubleshooting

| Problem | Solution |
|---|---|
| `MISSING` env variables | Check `.env` is in `backend/` folder, no spaces around `=` |
| Gemini 429 Too Many Requests | Free tier limit. Wait 1 min or create new API key |
| Gemini 503 Service Unavailable | High demand spike. Wait 30–60 mins and retry |
| Email fails to send | Use 16-char App Password, NOT real Gmail password |
| UiPath: connection refused localhost:5000 | Start backend first with `node server.js` |
| Articles not appearing after RPA | Check `RPA_USER_ID` in `.env` matches Supabase users table |
| Login fails | Use `SUPABASE_SERVICE_KEY` (service_role), NOT the anon key |
| Attachments not showing | Check Supabase Storage `attachments` bucket is set to Public |

---

<div align="center">
  <strong>Built with ❤️ for DHL Logistics Operations</strong><br/>
  React · Node.js · Supabase · Google Gemini AI · UiPath
</div>
