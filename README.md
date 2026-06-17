# FITS Oman — Platform Monorepo

A consolidated repository bringing together the four products that make up the **FITS Oman** software portfolio. Each project is self-contained in its own top-level folder with its own build tooling, dependencies, and documentation.

| Project | Folder | Domain | Primary Stack |
|---|---|---|---|
| **InsightPulse** | [`insightpulse/`](insightpulse/) | AI-powered multi-channel survey & experience analytics | React 18 · Express · TypeScript · PostgreSQL |
| **FITS HCMS** | [`hcms/`](hcms/) | Human Capital Management System (recruitment, attendance, payroll, e-sign) | Django 4.2 · Python 3.13 · PostgreSQL/SQLite |
| **FITS HCMS — New UI** | [`hcms-ui/`](hcms-ui/) | Figma-rebuilt recruitment & talent-acquisition front end | Django 4.2 · HTMX · Server-side rendering |
| **TEEJARTI** | [`businessmatchoman/`](businessmatchoman/) | Business marketplace for the Oman / GCC region | React 18 · Express · Drizzle ORM · PostgreSQL |

> **Confidential — Internal.** This repository and its architecture documents contain proprietary design information. Do not distribute outside the authorised recipient list.

---

## 1. InsightPulse — `insightpulse/`

AI-powered, multi-channel survey and experience-management platform that captures customer and employee feedback across **four channels** — Voice (VAPI), WhatsApp (Meta Cloud API), Web/Link, and Email — and converts it into real-time, AI-enriched analytics.

- **Architecture:** Modular monolith packaged as a single deployable unit (`rest-express`), partitioned into `client/`, `server/`, and `shared/` with a shared Drizzle/Zod type system.
- **Unified analytics pipeline:** Regardless of channel, every submission converges on a single pair of tables (`responses` + `feedback_analytics`) and is enriched by an LLM (sentiment, 8-emotion Plutchik model, themes, recommendations) — one source of truth for all dashboards.
- **Experience metrics:** CSAT, NPS (promoter/passive/detractor), CES (0–100 normalised), and a proprietary EVI (Emotional Value Index).
- **Tech stack:** React 18 + Vite + Wouter + TanStack Query + Radix/shadcn + i18next (EN/AR, RTL); Node.js + Express 4.21 + Passport; PostgreSQL (Neon) + Drizzle ORM; OpenRouter LLM gateway (deepseek-chat primary, gemini-2.0-flash fallback).
- **Integrations:** VAPI voice, Meta WhatsApp Cloud API, Zoho CRM (OAuth), OpenRouter, SMTP/Gmail.
- **Scale:** ~65 tables, ~257 API endpoints, 33 route modules, 22 domain services.

Full detail: [`insightpulse/InsightPulse-Technical-Architecture-Document.pdf`](insightpulse/InsightPulse-Technical-Architecture-Document.pdf).

**Quick start**
```bash
cd insightpulse
cp .env.example .env   # fill in credentials
npm install
npm run dev            # Vite + Express on port 5001
```

---

## 2. FITS HCMS — `hcms/`

The FITS **Human Capital Management System**: a Django 4.2 monolith covering the full HR lifecycle — recruitment, attendance, biometric/face detection, geofencing, expenses, documents, audit, automations, LDAP, and more.

- **Tech stack:** Django 4.2 · Python 3.13 · PostgreSQL (prod, Neon + PgBouncer) / SQLite (dev) · Django REST Framework.
- **Modules** (selected): `recruitment`, `attendance`, `biometric`, `facedetection`, `geofencing`, `expenses`, `employee`, `fits_audit`, `fits_automations`, `fits_ldap`, `fits_documents`, `fits_backup`.
- **Recruitment lifecycle:** Job Requisition → Approval → Publish → Candidate Intake (AI CV screening) → Interview → Employment Proposal (e-sign) → Offer Letter (e-sign) → Hire, with sequential e-sign approval chains and per-step SLA tracking.

Project conventions are documented in [`hcms/CLAUDE.md`](hcms/CLAUDE.md) and [`hcms/README.md`](hcms/README.md).

**Quick start**
```bash
cd hcms
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in credentials
python manage.py migrate
python manage.py runserver
```

---

## 3. FITS HCMS — New UI — `hcms-ui/`

A self-contained Django application (`ui/`) that re-implements the FITS recruitment journey against a modern, **Figma-authored** visual design. It deliberately does **not** extend or import the legacy view/template layers, so the legacy code can be removed in a single cut-over once the rebuild is complete.

- **Architectural style:** Server-side-rendered (SSR) monolith — Django views render HTML templates, with HTMX + vanilla JavaScript for partial updates. No SPA framework.
- **Strict separation principle:** No imports from `base.views` into `ui/views.py`; New UI extends only `ui/base.html`; a parallel auth boundary at `/ui/login/` independent of the legacy `/login/`.
- **Capabilities:** Sequential e-sign approval chains (DocuSign eSignature + Adobe Acrobat Sign behind a provider-agnostic interface), AI-assisted CV screening (poll-based UI), and Groq-backed Job Description generation.
- **Tech stack:** Django 4.2 · HTMX · hand-authored CSS (Inter font, Material Symbols) · PDF generation via xhtml2pdf/reportlab/PyMuPDF · Brevo SMTP.

Full detail: [`hcms/docs/UI_TECHNICAL_DESIGN_DOCUMENT.pdf`](hcms/docs/UI_TECHNICAL_DESIGN_DOCUMENT.pdf).

**Quick start**
```bash
cd hcms-ui
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in credentials
python manage.py migrate
python manage.py runserver
```

---

## 4. TEEJARTI (businessmatchoman) — `businessmatchoman/`

A full-stack business marketplace platform connecting business owners and investors in the Oman and GCC region.

- **Features:** Business listing management with bilingual support, user authentication and KYC verification, multi-language EN/AR with RTL layout, admin dashboard for content moderation, document/image management, HuggingFace-powered translation, newsletter subscriptions, and SendGrid email notifications.
- **Tech stack:** React 18 + TypeScript + Shadcn/UI + Tailwind CSS; Node.js + Express.js + JWT auth; PostgreSQL with Drizzle ORM; HuggingFace Inference API; SendGrid; Multer file uploads.

Full detail: [`businessmatchoman/README.md`](businessmatchoman/README.md).

**Quick start**
```bash
cd businessmatchoman
npm install
cp .env.example .env   # fill in credentials
npm run dev            # http://localhost:5000
```

---

## Repository Notes

- This monorepo is a **snapshot** of the four projects' working trees — dependencies (`node_modules/`, `.venv/`), local databases (`*.sqlite3`), build output, and secret env files (`.env`, `.env.local`, `.env.test`) are intentionally excluded. Only `.env.example` / `.env.dist` templates are tracked.
- Each project keeps its own tooling; install and run from inside its folder as shown above.
- Configure each project's environment by copying its `.env.example` to `.env` and supplying credentials before running.
