# Project: Job Profitability Tracker (SaaS)

## Overview

A job profitability tracker for service businesses (landscapers, builders, tradespeople). Allows business owners and teams to input quoted job costs (labour, materials, plant hire, waste), then track actual costs as work progresses — showing real-time profit/loss per job.

The app must be SaaS-ready from day one: multi-tenant, role-based access, mobile-first, with a pricing model based on company size (1-3 users, 4-7, 8-15).

The first customer is Lambert's Landscapes, a Kent-based hard landscaping business with 3 install teams, a salesperson, and a middle manager. But the product is generic — suitable for any service business.

---

## FIRST-RUN SETUP — Run these commands before writing any code

Before starting development, install the following plugins and MCP servers. Run each command in sequence and confirm they complete successfully before proceeding.

```bash
# 1. Add the official Anthropic plugin marketplace
/plugin marketplace add anthropics/claude-plugins-official

# 2. Install Supabase skills pack for database/auth/storage best practices
/plugin install supabase-pack

# 3. Add the Next.js/Supabase development framework (quality gates, agents, rules)
/plugin marketplace add darraghh1/my-claude-setup

# 4. Add the Next.js/Supabase slash commands and agents
/plugin marketplace add edmund-io/edmunds-claude-code

# 5. Install Context7 MCP for live documentation lookup (Next.js, Supabase, Stripe docs)
claude mcp add context7 -- npx -y @upstash/context7-mcp@latest

# 6. Connect Supabase MCP server (replace PROJECT_REF and keys after Supabase project creation)
# claude mcp add supabase --url "https://mcp.supabase.com/mcp?project_ref=YOUR_PROJECT_REF&features=docs,account,database,debugging,development,functions,branching,storage"
```

After plugins are installed, proceed to the tech stack setup below.

---

## Tech Stack

- **Framework:** Next.js 14+ (App Router) with TypeScript
- **Styling:** Tailwind CSS
- **Backend/Database:** Supabase (Postgres + Auth + Storage + Row Level Security)
- **Image Storage:** Supabase Storage (S3-compatible bucket for job photos and receipts)
- **Deployment:** Vercel
- **Billing (Phase 3):** Stripe
- **Package Manager:** pnpm

---

## User Roles

Four role tiers with cascading permissions:

| Role | Access | Can See Costs? | Can Edit Jobs? | Billing Access? |
|------|--------|---------------|----------------|-----------------|
| **Owner/Admin** | Everything | Yes — all jobs | Yes — all jobs | Yes |
| **Manager** | All teams and jobs | Yes — all jobs | Yes — all jobs | No |
| **Team Leader** | Assigned jobs only | Yes — their jobs | Yes — log costs, upload photos, update progress | No |
| **Operative** | Assigned jobs only | No — read-only on costs | No — can upload photos and log hours only | No |

---

## Database Schema

### Core Tables

**companies**
- id (uuid, PK)
- name (text)
- logo_url (text, nullable)
- plan_tier (enum: starter, growth, pro)
- stripe_customer_id (text, nullable)
- created_at (timestamptz)

**users**
- id (uuid, PK, references auth.users)
- company_id (uuid, FK → companies)
- name (text)
- email (text)
- role (enum: owner, manager, team_leader, operative)
- team_id (uuid, FK → teams, nullable)
- avatar_url (text, nullable)
- created_at (timestamptz)

**teams**
- id (uuid, PK)
- company_id (uuid, FK → companies)
- name (text)
- leader_id (uuid, FK → users, nullable)
- created_at (timestamptz)

**jobs**
- id (uuid, PK)
- company_id (uuid, FK → companies)
- team_id (uuid, FK → teams, nullable)
- client_name (text)
- client_address (text, nullable)
- client_email (text, nullable)
- client_phone (text, nullable)
- description (text)
- status (enum: quoted, booked, in_progress, complete, invoiced)
- start_date (date, nullable)
- end_date (date, nullable)
- quoted_total (numeric, computed from quoted_costs)
- actual_total (numeric, computed from actual_costs)
- created_by (uuid, FK → users)
- created_at (timestamptz)
- updated_at (timestamptz)

**quoted_costs**
- id (uuid, PK)
- job_id (uuid, FK → jobs)
- category (enum: labour, materials, plant_hire, waste, other)
- description (text)
- quantity (numeric)
- unit (text — e.g. "days", "tonnes", "m²", "each", "loads")
- unit_cost (numeric)
- line_total (numeric, computed: quantity × unit_cost)
- sort_order (integer)
- created_at (timestamptz)

**actual_costs**
- id (uuid, PK)
- job_id (uuid, FK → jobs)
- category (enum: labour, materials, plant_hire, waste, other)
- description (text)
- quantity (numeric)
- unit (text)
- unit_cost (numeric)
- line_total (numeric, computed: quantity × unit_cost)
- logged_by (uuid, FK → users)
- receipt_photo_url (text, nullable)
- logged_at (timestamptz)

**job_updates**
- id (uuid, PK)
- job_id (uuid, FK → jobs)
- user_id (uuid, FK → users)
- update_type (enum: photo, note, status_change, cost_logged, daily_checkin)
- content (text, nullable)
- photo_urls (text[], nullable)
- created_at (timestamptz)

**photos**
- id (uuid, PK)
- job_id (uuid, FK → jobs)
- user_id (uuid, FK → users)
- storage_path (text)
- url (text)
- caption (text, nullable)
- taken_at (timestamptz)

### Row Level Security (RLS)

All tables must have RLS enabled. Key policies:

- Users can only access data where `company_id` matches their own company
- Team leaders and operatives can only see jobs where `team_id` matches their team
- Operatives cannot read `quoted_costs` or `actual_costs` financial data
- Only owners can modify company settings

### Supabase Realtime

Enable Realtime on the `jobs` table (via Supabase dashboard or migration: `alter publication supabase_realtime add table jobs;`). This powers the live calendar — when any user changes a job's dates, status, or team assignment, all connected clients receive the update instantly via websocket.

---

## Feature Phases

### Phase 1 — MVP (Build First)

This is the minimum viable product that must work end-to-end before any Phase 2 work begins.

1. **Auth & Onboarding**
   - Email/password signup creates a company + owner user
   - Owner can invite team members via email (generates invite with role pre-set)
   - Login/logout, password reset
   - Company profile page (name, logo upload)

2. **Team Management**
   - Create/edit/delete teams
   - Assign team leader
   - Assign operatives to teams

3. **Job Creation & Quoting**
   - Create job: client details, description, assigned team, dates
   - Add quoted cost line items by category (labour days, materials, plant hire, waste, other)
   - Each line: description, quantity, unit, unit cost → auto-calculated line total
   - Job quoted total = sum of all quoted cost lines
   - Job status workflow: Quoted → Booked → In Progress → Complete → Invoiced

4. **Actual Cost Tracking**
   - Log actual costs against a job (same categories as quoted)
   - Each entry: description, quantity, unit, unit cost, optional receipt photo
   - Running actual total updates in real time

5. **Profitability View**
   - Per-job view: quoted total vs actual total
   - Profit/loss in £ and % 
   - Breakdown by category (quoted labour vs actual labour, etc.)
   - Traffic light indicator: Green (on/under budget), Amber (within 10%), Red (over budget)

6. **Photo Uploads**
   - Upload photos from camera or gallery (mobile)
   - Attach to a job with optional caption
   - Photos appear in job timeline

7. **Job Timeline**
   - Chronological feed of all updates per job: photos, notes, status changes, costs logged
   - Each entry shows who, when, what

8. **Dashboard**
   - All active jobs with status, team, margin indicator
   - Quick stats: total active jobs, total quoted value, total profit/loss across active jobs
   - Filter by team, by status

9. **Calendar / Team Schedule View**
   - A main navigation tab showing all jobs plotted on a calendar by team
   - Weekly view (default): rows = teams, columns = days. Each job is a coloured block spanning its start-to-end dates
   - Monthly view: condensed overview of all teams' schedules
   - Day view: detailed list of what each team is doing that day
   - Colour coding: job blocks coloured by status (quoted = grey, booked = blue, in progress = orange, complete = green)
   - Click a job block to open the job detail/profitability view
   - Drag and drop to reschedule: move a job to different dates or reassign to a different team
   - **Cascade scheduling (critical feature):**
     - When a job's end date is extended (manually or via drag), the app identifies all subsequent jobs on that same team that would now overlap or be affected
     - A confirmation modal appears showing: the job being changed, a list of all downstream jobs that will shift, the number of days each will move, and the new dates for each
     - Two buttons: "Apply cascade" (shifts all downstream jobs) and "Cancel" (reverts the change)
     - Cascade logic: subsequent jobs shift by exactly the number of days the overrun extends into their slot. Gaps between jobs are preserved — if there was a 2-day gap between Job B and Job C, that gap remains after the cascade
     - Only jobs on the SAME TEAM are affected by cascade. Other teams are unaffected
     - Jobs with status "Complete" or "Invoiced" are never moved by cascade
     - After cascade is applied, a toast notification summarises: "3 jobs shifted on Team Billy — next available start moved to [date]"
     - Edge case: if a cascaded job would push into a date where the team already has another job (e.g. a job was manually scheduled with a gap), flag this as a conflict and highlight both jobs in red on the calendar
   - **Realtime updates (Supabase Realtime):**
     - Subscribe to changes on the `jobs` table filtered by `company_id`
     - When any user updates a job's dates, status, or team assignment, all other users viewing the calendar see the change reflected immediately without refreshing
     - Use Supabase Realtime channels with Postgres CDC (Change Data Capture)
     - Show a subtle animation when a job block moves or changes on another user's screen (brief highlight/pulse)
   - Team capacity indicator: show how many days each team has booked vs available in the current week/month
   - "Unscheduled jobs" panel: jobs with status "Booked" but no start date assigned, shown as a draggable list that can be dropped onto the calendar
   - Accessible to Owner, Manager, and Team Leaders (team leaders see only their team's row)

10. **Mobile Responsive**
   - All screens must work well on mobile (team leaders and operatives use phones on site)
   - Photo upload must use device camera
   - Touch-friendly controls, large tap targets
   - Calendar view on mobile: defaults to day view with swipe navigation between days

### Phase 2 — Team Engagement (Build Second)

- Daily time logging per team member per job
- Material purchase logging with receipt photo
- Push notifications (job assigned, margin alert when job hits amber/red)
- Team leader daily check-in (start/end site photos, weather note, progress summary)
- PDF job report export (for client updates or internal review)
- Search and filter across all jobs

### Phase 3 — Growth & SaaS Features (Build Third)

- Stripe integration for subscription billing
- Pricing tiers: Starter (1-3 users, £29-39/mo), Growth (4-7 users, £59-79/mo), Pro (8-15 users, £99-129/mo)
- 14-day free trial, no card required
- Annual billing option (pay 10, get 12)
- Profitability reporting (by job, team, month, job type)
- Recurring cost templates (save and reuse common material lists)
- Client portal (share progress photos/updates with clients via link)
- Integrations (Xero/QuickBooks)
- Quote builder (create and send quotes from within the app)
- Landing page / marketing website

### Phase 4 — Design, Branding & PWA (Build Fourth)

This phase happens AFTER the app is functionally complete and tested with real users. Do not invest in design polish until the workflow and features are validated.

- **PWA (Progressive Web App):** Add service worker, web app manifest, offline caching, and "Add to Home Screen" support so the app feels native on mobile without needing app stores
- **Brand identity:** Logo, colour scheme, app name, favicon, OG images
- **Design system:** Consistent component library — buttons, cards, forms, modals, badges — with proper spacing, shadows, and transitions
- **Typography upgrade:** Replace default fonts with a distinctive, legible pair (display + body)
- **Micro-interactions:** Loading animations, transition effects, toast notifications
- **Onboarding flow:** First-run experience for new signups — guided tour of key features
- **Dark mode** (optional, if user demand warrants it)

---

## UI/UX Guidelines

- **Design:** Clean, professional, utilitarian. This is a tool for tradespeople — not a consumer app. Prioritise clarity and speed over decoration.
- **Navigation:** Bottom tab bar on mobile (Dashboard, Calendar, Jobs, Add Cost, Settings). Sidebar on desktop with full navigation including Photos.
- **Colour palette:** Use a dark navy or charcoal as primary, with green/amber/red for margin indicators. White/light grey backgrounds for content areas.
- **Typography:** Sans-serif, highly legible at small sizes on mobile.
- **Key interaction patterns:**
  - Adding a cost should be fast — 3 taps maximum from any job screen
  - Photo upload should open camera directly on mobile
  - Job cards on dashboard should show: client name, team, status badge, margin % with traffic light colour

---

## Build Order

Follow this exact sequence. Complete each step fully before moving to the next.

1. **Project scaffolding** — Next.js + Tailwind + TypeScript + pnpm setup
2. **Supabase project** — Create project, run migration for full schema above, enable RLS policies
3. **Auth flow** — Signup (creates company + owner), login, logout, password reset
4. **Team management** — CRUD for teams, assign leader
5. **User invites** — Owner invites users with role, invite acceptance flow
6. **Job CRUD** — Create/edit jobs with client details, status, team assignment
7. **Quoted costs** — Add/edit/delete quoted cost line items per job
8. **Actual costs** — Log actual costs with receipt photo upload
9. **Profitability view** — Quoted vs actual comparison with traffic lights
10. **Photo uploads** — Camera/gallery upload attached to jobs
11. **Job timeline** — Chronological feed of all job activity
12. **Dashboard** — Active jobs overview with margin indicators
13. **Calendar / schedule view** — Team scheduling grid with drag-and-drop, cascade logic, capacity indicators
14. **Mobile optimisation pass** — Test and refine all screens on mobile viewports

---

## Code Conventions

- Use TypeScript strict mode throughout
- All database queries go through a typed Supabase client (generate types from schema)
- Server components by default, client components only when needed (forms, interactive elements)
- Use Server Actions for mutations
- All forms use react-hook-form with zod validation
- Error boundaries on all pages
- Loading states on all data-fetching components
- All monetary values stored as numeric in Postgres, displayed with £ symbol and 2 decimal places
- Dates stored as UTC, displayed in UK timezone (Europe/London)
- File uploads go to Supabase Storage bucket named "job-photos"
- All images compressed client-side before upload (max 1920px wide, 80% quality)
- Supabase Realtime: subscribe to job changes on the calendar view so all connected users see updates instantly. Use `supabase.channel()` with Postgres CDC. Unsubscribe on component unmount to avoid memory leaks
