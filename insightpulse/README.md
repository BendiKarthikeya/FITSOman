# InsightPulse

> **AI-Powered Multi-Channel Survey Platform** — Collect customer feedback through Voice (VAPI), WhatsApp (Meta Cloud API), Web/Link, and Email channels with real-time analytics and AI-powered insights.

[![Live](https://img.shields.io/badge/Live-skill--pulse.io-brightgreen.svg)](https://skill-pulse.io/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue.svg)](https://www.postgresql.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5+-blue.svg)](https://www.typescriptlang.org/)

**Live:** [skill-pulse.io](https://skill-pulse.io/)

---

## Features

### Multi-Channel Survey Distribution
- **Voice Surveys** — AI-powered phone surveys via VAPI with structured output (CSAT/NPS/CES/EVI)
- **WhatsApp Surveys** — Sequential question delivery via Meta WhatsApp Cloud API
- **Web Surveys** — Interactive web forms with real-time validation
- **Email Surveys** — Share survey links via email

### Advanced Analytics
- **Real-time Dashboard** — Live metrics auto-refreshed every 30 seconds
- **Unified Analytics Pipeline** — All channels write to a single `responses` + `feedback_analytics` table pair
- **5 Analytics Tabs** — Overview, CSAT/NPS, Customer Journey, Trends, Insights — all dynamic from DB
- **EVI Score** — Emotional Value Index (0–100)
- **NPS Tracking** — Net Promoter Score with promoter/passive/detractor breakdown
- **CSAT Metrics** — Customer Satisfaction with period-over-period delta
- **CES Measurement** — Customer Effort Score (1–5 normalized to 0–100%)
- **Sentiment Analysis** — 8-emotion Plutchik model via OpenRouter LLM
- **Department NPS** — Auto-aggregated per department on every submission
- **Recommended Actions** — Derived from LLM-generated insights

### CRM Integration
- **Zoho CRM OAuth** — Fetch and sync contacts
- **Targeted Surveys** — Send surveys directly to CRM contacts

### Role-Based Access Control (RBAC)
- Granular permissions, organization/department hierarchy, audit logs, session management

### Survey Management
- Dynamic question builder, templates, conditional logic, multi-language (English/Arabic), action plans

---

## Architecture

```
┌───────────────────────────────────────────────────────────────────┐
│                        Frontend (React 18)                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────────┐   │
│  │Dashboard │  │ Surveys  │  │Responses │  │Analytics (×5)  │   │
│  └──────────┘  └──────────┘  └──────────┘  └────────────────┘   │
│           TanStack Query — polls /api/unified-analytics/metrics    │
│                         every 30 seconds                          │
└────────────────────────────┬──────────────────────────────────────┘
                             │ REST API
┌────────────────────────────▼──────────────────────────────────────┐
│                       Backend (Express)                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐  ┌────────────┐   │
│  │   API    │  │  VAPI    │  │  WhatsApp    │  │  Unified   │   │
│  │  Routes  │  │ Webhook  │  │  Webhook     │  │ Analytics  │   │
│  └──────────┘  └──────────┘  └──────────────┘  └────────────┘   │
│                         OpenRouter LLM                            │
│              (deepseek-chat primary / gemini-2.0-flash fallback)  │
└────────────────────────────┬──────────────────────────────────────┘
                             │
┌────────────────────────────▼──────────────────────────────────────┐
│                    Database (PostgreSQL / Neon)                    │
│  ┌───────────┐  ┌──────────────────┐  ┌────────────────────────┐ │
│  │  surveys  │  │    responses     │  │   feedback_analytics   │ │
│  │questions  │  │ (scores+answers) │  │ (LLM payload+themes)   │ │
│  └───────────┘  └──────────────────┘  └────────────────────────┘ │
│  ┌───────────┐  ┌──────────────────┐  ┌────────────────────────┐ │
│  │   users   │  │  department_nps  │  │   structured_outputs   │ │
│  │   roles   │  │ (auto-aggregated)│  │  (VAPI raw scores)     │ │
│  └───────────┘  └──────────────────┘  └────────────────────────┘ │
└────────────────────────────┬──────────────────────────────────────┘
                             │
┌────────────────────────────▼──────────────────────────────────────┐
│                    External Integrations                          │
│   VAPI (Voice AI)  │  Meta WhatsApp Cloud API  │  Zoho CRM       │
└───────────────────────────────────────────────────────────────────┘
```

### Analytics Data Flow

```
Survey submitted (Web / WhatsApp / VAPI voice)
          │
          ▼
OpenRouter LLM analyzes answers          ← skipped for VAPI (uses structured outputs)
          │
          ▼
  ┌───────────────┐    ┌────────────────────────┐
  │   responses   │    │   feedback_analytics   │
  │  npsScore     │    │  category (theme)      │
  │  csatScore    │    │  sentiment             │
  │  eviScore     │    │  insights[]            │
  │  cesScore     │    │  recommendations[]     │
  │  respondent   │    │  emotions (Plutchik×8) │
  └───────┬───────┘    └────────────┬───────────┘
          └──────────┬──────────────┘
                     ▼
         aggregateDepartmentNps()   ← resolves dept via email/phone
                     │
                     ▼
            department_nps table
                     │
                     ▼
   GET /api/unified-analytics/metrics
   (read by all 5 analytics tabs, polled every 30s)
```

---

## Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **PostgreSQL** 15+ (or a [Neon](https://neon.tech) serverless Postgres URL)
- **VAPI Account** — for voice surveys
- **Meta WhatsApp Business Account** — for WhatsApp surveys
- **Zoho CRM Account** — optional, for CRM integration

### Installation

```bash
# Clone the repository
git clone https://github.com/workingaditya/insightpulse.git
cd insightpulse

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your credentials

# Push schema to database
npm run db:push

# Start development server
npm run dev
```

App available at **http://localhost:5001** (frontend + API share the same port via Vite middleware).

---

## Environment Configuration

```bash
# Database (Neon serverless Postgres or standard Postgres)
DATABASE_URL=postgresql://user:password@host:5432/insightpulse

# Server
PORT=5001
NODE_ENV=development

# Authentication
JWT_SECRET=your_jwt_secret_key_here

# VAPI Configuration (Voice Surveys)
VAPI_API_KEY=your_vapi_api_key
VAPI_PHONE_NUMBER_ID=your_vapi_phone_number_id
VAPI_ASSISTANT_ID=your_vapi_assistant_id

# Meta WhatsApp Cloud API
META_WA_ACCESS_TOKEN=your_meta_access_token
META_WA_PHONE_NUMBER_ID=your_meta_phone_number_id
META_WA_VERIFY_TOKEN=your_webhook_verify_token
META_WA_GRAPH_VERSION=v21.0

# CRM Integration (Zoho CRM)
ZOHO_CLIENT_ID=your_zoho_client_id
ZOHO_CLIENT_SECRET=your_zoho_client_secret
ZOHO_REDIRECT_URI=http://localhost:5001/crm-oauth-callback

# OpenRouter (LLM)
OPENROUTER_API_KEY=your_openrouter_api_key

# Public URL (for webhooks)
PUBLIC_BASE_URL=https://your-domain.com
```

---

## Project Structure

```
insightpulse/
├── client/                             # Frontend React application
│   ├── index.html                      # Vite entry point
│   └── src/
│       ├── App.tsx                     # Root router (Wouter)
│       ├── main.tsx
│       └── pages/                      # Legacy UI (reachable at /ui/* only)
│
├── client/ui/                          # Current UI (Figma-based — all new work goes here)
│   ├── pages/                          # Page components
│   └── components/                     # Shared UI components
│
├── server/                             # Express backend
│   ├── index.ts                        # Server entry — registers all routes, starts scheduler
│   ├── routes/                         # Route handlers (one file per feature area)
│   │   ├── surveyResponseRoutes.ts     # Web survey submission + LLM analysis
│   │   ├── voiceRoutes.ts              # VAPI voice webhooks
│   │   ├── whatsappRoutes.ts           # Meta WhatsApp Cloud API webhooks
│   │   ├── unifiedAnalyticsRoutes.ts   # /api/unified-analytics/metrics
│   │   ├── crmIntegrationRoutes.ts     # Zoho CRM OAuth + contacts
│   │   ├── rbacRoutes.ts               # Roles & permissions
│   │   └── ...
│   ├── services/                       # Business logic
│   │   ├── unifiedAnalyticsService.ts  # Aggregates all 5 tab data from DB
│   │   ├── departmentNpsService.ts     # Auto-aggregates NPS by department
│   │   ├── structuredOutputService.ts  # Parses VAPI structured outputs
│   │   ├── surveyScheduler.ts          # Survey scheduling (started at boot)
│   │   └── ...
│   ├── storageFactory.ts               # Singleton DB storage entry point
│   └── db.ts                           # Drizzle + Neon connection
│
├── shared/                             # Shared schema + Zod types
│   ├── schema.ts                       # Drizzle schema (source of truth)
│   └── schemas.ts                      # Zod validation schemas
│
├── migrations/                         # Hand-written SQL migrations
│   ├── core/                           # Core infrastructure
│   └── features/                       # Feature-specific migrations
│
├── scripts/                            # Utility scripts
│   ├── database/                       # Migrations & DB fixes
│   │   ├── run-migration.mjs
│   │   ├── migrate-anonymous-feedback.mjs
│   │   ├── migrate-schedule-dates.ts
│   │   └── fix-nps-scale.ts
│   ├── setup/                          # DB setup & seeding
│   │   ├── setup-db.mjs
│   │   ├── create-all-templates.ts
│   │   ├── seed-employees.ts
│   │   ├── seed-dummy-surveys.ts
│   │   ├── create-admin.ts
│   │   └── ...
│   ├── utils/                          # Testing & utilities
│   │   ├── test-e2e-analytics-tabs.ts
│   │   ├── test-analytics-llm.ts
│   │   ├── generate-analytics.js
│   │   ├── check-survey-responses.ts
│   │   └── ...
│   └── test-data/
│       └── backfill_response.json
│
├── tests/                              # Vitest test suite
│   ├── vitest.config.ts
│   ├── unit/
│   └── integration/
│
├── package.json
├── tsconfig.json
├── vite.config.ts
├── drizzle.config.ts
└── .env.example
```

---

## API Endpoints

### Surveys
```
GET    /api/surveys              # List surveys
POST   /api/surveys              # Create survey
GET    /api/surveys/:id
PUT    /api/surveys/:id
DELETE /api/surveys/:id
```

### Survey Responses
```
POST   /api/survey-responses/analyze   # Submit + analyze web response
GET    /api/responses
GET    /api/responses/:id
```

### Analytics
```
GET    /api/unified-analytics/metrics  # All 5 tab data (polled every 30s)
GET    /api/analytics
GET    /api/survey-analytics/:id
```

### Voice (VAPI)
```
POST   /api/voice/initiate       # Start voice call
POST   /api/voice/webhook        # VAPI webhook
```

### WhatsApp (Meta Cloud API)
```
POST   /api/whatsapp/send-survey          # Send to single number
POST   /api/whatsapp/send-survey-bulk     # Send to multiple numbers
GET    /api/whatsapp/webhook              # Meta webhook verification
POST   /api/whatsapp/webhook              # Meta webhook events
```

### CRM (Zoho)
```
GET    /api/crm/configs
POST   /api/crm/configs
PUT    /api/crm/configs/:id
DELETE /api/crm/configs/:id
GET    /api/crm/oauth/authorize
POST   /api/crm/oauth/callback
GET    /api/crm/contacts
POST   /api/crm/send-survey
```

### User Management & RBAC
```
GET/POST/PUT/DELETE  /api/users
POST                 /api/users/invite
GET/POST/PUT/DELETE  /api/rbac/roles
GET                  /api/rbac/permissions
GET/POST             /api/rbac/role-permissions
GET                  /api/activity-logs
GET                  /api/sessions
GET/POST             /api/audit-logs
```

### Action Plans
```
GET/POST/PUT/DELETE  /api/action-plans
GET                  /api/action-plans/:id
```

---

## Commands

```bash
npm run dev              # Dev server on :5001
npm run build            # Vite client build + esbuild server bundle
npm start                # Run production bundle
npm run check            # TypeScript typecheck (no emit)
npm run db:push          # Push Drizzle schema to DB

npm test                 # vitest run (all tests)
npm run test:unit
npm run test:integration
npm run test:coverage

# Single test file
npx vitest run --config tests/vitest.config.ts tests/<file>.test.ts
```

### Database
Schema is managed via `db:push` (Drizzle push workflow). Raw SQL migrations for additive changes live in `migrations/` and are run manually:

```bash
npm run db:push                # Sync schema.ts to DB
npm run migrate:analytics      # Run analytics SQL migration
node scripts/database/run-migration.mjs  # Run a specific migration
```

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, TailwindCSS, shadcn/ui, TanStack Query, Wouter |
| Backend | Express.js, TypeScript, Drizzle ORM |
| Database | PostgreSQL via Neon serverless driver |
| AI/LLM | OpenRouter — deepseek-chat (primary), gemini-2.0-flash (fallback) |
| Voice | VAPI |
| WhatsApp | Meta WhatsApp Cloud API |
| CRM | Zoho CRM OAuth |

---

## Troubleshooting

**Port already in use**
```bash
lsof -ti:5001 | xargs kill -9
```

**Database connection error**
```bash
# Check DATABASE_URL is set and reachable
pg_isready
```

**VAPI webhook not receiving data**
- Ensure `PUBLIC_BASE_URL` is set and publicly reachable
- Verify webhook URL in VAPI dashboard matches `PUBLIC_BASE_URL/api/voice/webhook`

**WhatsApp messages not sending**
- Verify `META_WA_ACCESS_TOKEN` and `META_WA_PHONE_NUMBER_ID` are set
- Phone numbers must be in E.164 format (e.g. `+96812345678`)
- Ensure `META_WA_VERIFY_TOKEN` matches the token in Meta Developer Console
- Confirm `PUBLIC_BASE_URL` is reachable from Meta's servers

---

## License

MIT — see [LICENSE](LICENSE).

---

## Acknowledgments

- [VAPI](https://vapi.ai) — Voice AI platform
- [Meta WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api) — WhatsApp Business messaging
- [OpenRouter](https://openrouter.ai) — LLM gateway
- [shadcn/ui](https://ui.shadcn.com) — UI components
- [Drizzle ORM](https://orm.drizzle.team) — Database toolkit
- [Neon](https://neon.tech) — Serverless Postgres

---

<div align="center">
  <strong>Built for better customer insights</strong>
</div>
