# ResolveIt OS — Build Progress

## What's Live

### Infrastructure
- **Next.js 14** (App Router, TypeScript, Tailwind CSS)
- **Supabase** auth, database, and row-level security
- **Deployed** to Vercel, auto-deploys on push to `main`
- **Shared NavBar** across all pages with active link highlighting and sign out

### Database (Supabase)
All tables created and live:
| Table | Purpose |
|-------|---------|
| `profiles` | Extends Supabase auth — stores role (admin/tutor), name, phone |
| `students` | Student records with curriculum info, grades, parent contact, payment status |
| `topics` | Curriculum backbone — ~170 topics seeded across GCSE + A-Level |
| `session_logs` | Every tutoring session logged by tutors; supports group sessions via `student_ids UUID[]` |
| `student_topic_progress` | Auto-updated by DB trigger when a session is logged |
| `resources` | Worksheet/resource library with Supabase Storage |
| `assessments` | Mock exams and test scores |
| `invoices` | Per-student invoices with status tracking |
| `schedule` | Weekly recurring schedule entries per tutor/student |
| `training_modules` | SOP/video/document modules for tutor onboarding |
| `tutor_training_progress` | Per-tutor completion status for each training module |

**DB trigger:** `update_student_topic_progress` — fires on every `INSERT` into `session_logs`, loops over `student_ids` array (falls back to `student_id`), upserts progress for each topic covered, increments `times_covered`, updates `latest_comprehension` and `last_covered_date`.

**Curriculum seeded:** GCSE (Foundation + Higher) for Edexcel and AQA. A-Level (Pure, Statistics, Mechanics) for Edexcel, AQA, and OCR.

**RLS policies:** Admins see everything. Tutors see only their assigned students, their own sessions, and their students' progress.

---

## Pages & Features Built

### Phase 1: Core MVP

#### `/login`
- Email + password auth via Supabase
- Role-based redirect: admin → `/dashboard`, tutor → `/tutor`
- Inline error display for bad credentials

#### `/dashboard` (admin only)
- **Stats row:** Active students · Sessions this week · Sessions this month · At-risk count
- **At-risk panel:** Flags students with 7+ days inactive, poor engagement last session, or <50% curriculum covered. Sorted by most flags, links to student profile
- **Recent sessions feed:** Last 10 sessions with student, tutor, engagement, comprehension, and topic chips
- **Tutor leaderboard:** Sessions per tutor this week, ranked, with last-active date
- **Quick actions:** Links to students, log session, add student
- Non-admins are redirected to `/tutor`

#### `/students` (admin sees all, tutors see assigned only)
- Table with search + filter by status, year group, tutor
- Shows: name, year, curriculum, current → target grade, tutor, progress bar %, status badge, payment badge
- Mobile card layout
- **Add Student modal** (admin only): full form with name, year, qualification, exam board, tier (GCSE only), grades, tutor assignment, parent contact, notes

#### `/students/[id]`
- **Header card:** Name, status, qualification, exam board, tier, tutor, current → target grade, progress bar
- **Progress tab:** Topic chips grouped by category, colour-coded (grey = not started, green = covered, gold = mastered). Hover tooltip shows times covered + comprehension
- **Sessions tab:** Reverse-chronological session cards with all session details
- **Details tab:** Student info + parent contact, admin-editable including payment status and monthly rate
- **Assessments tab:** Log Assessment modal, assessment history, grade progression SVG chart

#### `/log-session`
- Multi-select student picker (group session support) — tutors see only their students
- Curriculum validation when adding 2nd+ student (must match primary student's exam board)
- Date picker, session type, duration slider (30–120 mins)
- Searchable topic multi-select filtered by student's curriculum, grouped by category
- One-tap engagement + comprehension buttons
- Session notes + homework fields
- Sends `student_id` (primary) and `student_ids` (all) to API

#### `/tutor`
- Welcome message with first name, date
- Stats row: My Students, Sessions This Week, Sessions This Month
- Active student cards (2-col grid) with progress bars, links to profiles
- Paused/inactive students section
- Recent 10 sessions panel with engagement colour, topic chips
- Log Session CTA

#### `/tutors` (admin only)
- Sortable table (desktop) / mobile cards listing all tutors
- Columns: name, email, student count, sessions this week, last active
- Add Tutor modal: creates Supabase auth user + inserts profile row
- `/tutors/[id]` detail page: header stats, assigned students with unassign, recent sessions, assign modal

---

### Phase 2: Resource Library & Assessments

#### `/resources` ✅ BUILT
- Grid view with search + 5 filters (qualification, exam board, type, difficulty)
- Resource cards: title, linked topic, type badge, difficulty stars, exam board, download link
- Admin upload modal: file upload to Supabase Storage bucket ("resources") + metadata form
- Tutors can browse and download, not upload
- **Requires:** Supabase Storage bucket named "resources" with public access enabled

#### Assessment Tracking ✅ BUILT
- "Assessments" tab on every student profile (4th tab)
- Log Assessment modal: type (mock/diagnostic/topic_test), title, date, score, max_score, grade, notes
- Assessment history (reverse-chronological) with score %, grade, type badge
- Grade progression SVG line chart (appears when ≥2 graded assessments exist)
- Admin dashboard "Recent Assessments" widget shows last 5 across all students

---

### Phase 3: Payments & Revenue

#### Payment Status on Students ✅ BUILT
- `payment_status` ('paid'/'overdue'/'trial'/'free') and `monthly_rate` fields on students table
- Payment badge shown next to student name on `/students` list (green/red/amber, hidden when free)
- Payment status and monthly rate editable in student profile Details tab

#### Invoicing System ✅ BUILT
- `invoices` table with RLS (admins full access, tutors read-only for their students)
- **Invoices tab** on every student profile: create invoice modal, mark-paid inline, outstanding total
- **`/invoices`** admin page: full invoice list with summary stats (outstanding, collected, total), status filter, mark-paid, create invoice modal
- API routes: `GET/POST /api/invoices`, `PATCH /api/invoices/[id]`

#### Revenue Dashboard (`/revenue`) ✅ BUILT
- **MRR** (sum of monthly_rate for paid active students)
- **This Month** revenue (paid invoices with paid_date in current month)
- **Outstanding** (sent + overdue invoices)
- **Total Collected** (all time)
- **6-month SVG bar chart** of revenue collected by month
- **Payment status breakdown** (paid / overdue / trial / free counts for active students)

#### Stripe Prep ✅ BUILT
- `stripe_customer_id` column on students table (migration 005)
- `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` env vars in `.env.local`
- Placeholder webhook handler at `POST /api/stripe/webhook`

---

### Phase 5: Scale Features

#### Scheduling System (`/schedule`) ✅ BUILT
- `schedule` table: tutor_id, student_id, day_of_week, start_time, duration_minutes, recurring, status, notes
- RLS: admins full access, tutors see/create/update their own entries
- **`/schedule`** page: desktop CSS grid (Mon–Sun × 08:00–19:30), mobile day-pill selector
- Tutor colour coding (8 cycling colours), absolute-positioned session blocks
- Add Session modal (admin selects tutor, student filtered by tutor), Edit/Cancel modal
- **ICS export**: client-side Blob download with RRULE for recurring sessions
- API: `GET/POST /api/schedule`, `PATCH/DELETE /api/schedule/[id]`

#### Google Calendar Integration ✅ BUILT (placeholder)
- ICS file generation for all schedule types (importable into any calendar app)
- Placeholder OAuth endpoint at `POST /api/calendar/sync` (returns 501, ready to wire up)
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` env vars added

#### Tutor Training Hub (`/training`) ✅ BUILT
- `training_modules` table: title, type (sop/video/document), content (markdown), order_index
- `tutor_training_progress` table: tutor_id, module_id, status, completed_at
- **`/training`** page: module grid cards with type badge, status chip, overall progress bar
- Module detail modal: SOP renders markdown via minimal regex renderer, video shows iframe, document shows download link
- Tutors can mark in_progress/completed; admins can create/edit/delete modules
- 4 seeded modules: Session Delivery SOP, How to Log a Session, Communication Standards, Exam Board Overview
- API: `GET/POST /api/training`, `PATCH/DELETE /api/training/[id]`, `GET/POST /api/training/progress`

#### Group Session Support ✅ BUILT
- `student_ids UUID[]` column added to `session_logs` (migration 008), existing rows backfilled
- DB trigger updated to loop over `student_ids` array (falls back to `student_id` for backward compat)
- `SessionLogForm` rewritten: multi-select student picker with search, curriculum validation
- Submit sends both `student_id` (primary) and `student_ids` to API

#### Analytics Dashboard (`/analytics`) ✅ BUILT (admin only)
- Pure SVG charts (no chart library): reusable `BarChart` + `LineChart` components
- **Session volume**: weekly sessions line chart (last 90 days)
- **Topic frequency**: top-15 topics by session count (bar chart)
- **Topic difficulty**: avg comprehension by topic, ascending sort — lower = harder (bar chart)
- **Tutor effectiveness**: table with sessions, avg engagement, avg comprehension, colour-coded scores
- **Engagement trend**: weekly avg engagement line chart
- **Curriculum coverage**: per-curriculum progress bars (covered/mastered/total topics)
- Tutor filter dropdown to slice all charts by individual tutor
- Summary stats: sessions, hours delivered, avg engagement, unique students

#### Nav Updates ✅ BUILT
- Schedule + Training added to both admin and tutor nav
- Analytics added to admin nav only

---

## All API Routes

| Method | Route | Notes |
|--------|-------|-------|
| `POST` | `/api/auth/logout` | Signs out and redirects to `/login` |
| `GET` | `/api/students` | Role-filtered student list |
| `POST` | `/api/students` | Admin only — creates student |
| `GET` | `/api/students/[id]` | Single student with full data |
| `PUT` | `/api/students/[id]` | Update student details |
| `GET` | `/api/sessions` | Sessions (role-filtered, filterable by student) |
| `POST` | `/api/sessions` | Log a session — trigger handles progress update; accepts `student_ids` |
| `GET` | `/api/tutors` | List tutors (admin only) |
| `POST` | `/api/tutors` | Create tutor account via service role key |
| `GET` | `/api/tutors/[id]` | Tutor profile with students/sessions |
| `PATCH` | `/api/tutors/[id]` | Assign/unassign students |
| `GET` | `/api/resources` | List resources with filters |
| `POST` | `/api/resources` | Upload resource to Supabase Storage |
| `POST` | `/api/assessments` | Log assessment |
| `GET` | `/api/assessments/[studentId]` | Get assessments for student |
| `GET/POST` | `/api/invoices` | List/create invoices |
| `PATCH` | `/api/invoices/[id]` | Mark paid / update invoice |
| `GET/POST` | `/api/schedule` | List/create schedule entries |
| `PATCH/DELETE` | `/api/schedule/[id]` | Update/delete schedule entry |
| `POST` | `/api/calendar/sync` | Google Calendar OAuth (placeholder, returns 501) |
| `GET/POST` | `/api/training` | List/create training modules |
| `PATCH/DELETE` | `/api/training/[id]` | Update/delete training module |
| `GET/POST` | `/api/training/progress` | Get/upsert tutor module progress |
| `POST` | `/api/stripe/webhook` | Stripe webhook handler (placeholder) |

---

## DB Migrations Applied
| File | Purpose |
|------|---------|
| `001_initial.sql` | Core tables: profiles, students, topics, session_logs, student_topic_progress |
| `002_resources.sql` | Resources table + RLS |
| `003_assessments.sql` | Assessments table + RLS |
| `004_payments.sql` | payment_status, monthly_rate on students; invoices table |
| `005_stripe.sql` | stripe_customer_id on students; Stripe env prep |
| `006_schedule.sql` | schedule table + RLS |
| `007_training.sql` | training_modules + tutor_training_progress tables; seeds 4 modules |
| `008_group_sessions.sql` | student_ids UUID[] on session_logs; backfill; updated trigger |

---

## Known Issues / Tech Debt

### ⚠️ Active Build Error (as of 2026-04-08)
- **`app/training/TrainingView.tsx` line 538** — `AddModuleModal` initialised `form.type` with `"sop" as const`, narrowing the type to a literal. TypeScript then flags `form.type === "video"` as an impossible comparison. Fixed in latest commit by widening to `"sop" as "sop" | "video" | "document"`. Vercel build for this fix is in progress.

### Recurring Vercel Build Issues (now fixed)
- `fmtDT` declared as a function inside a `for` loop in `ScheduleView.tsx` — not allowed in strict mode. Fixed: converted to `const` arrow function.
- `[...new Set(...)]` spread in `ScheduleView.tsx` — requires `--downlevelIteration`. Fixed: `Array.from(new Set(...))`.
- `_request: NextRequest` unused params in DELETE handlers — ESLint no-unused-vars fires even with underscore prefix in this project. Fixed: added `eslint-disable-next-line` comments.
- `invoices` table block placed outside the `Tables` closing brace in `types.ts` — parsing error. Fixed: corrected brace placement.

### Ongoing Tech Debt
- The Supabase publishable/secret key format causes TypeScript inference to return `never` for query results — worked around with `as any` casts throughout. Will resolve if Supabase updates their TS types.
- `/resources` upload requires a Supabase Storage bucket named **"resources"** with public access enabled — must be created manually in Supabase dashboard.
- `/tutors/[id]` is a client component (uses `useEffect` + fetch) rather than a server component.
- `npm run build` cannot be run in the Claude Code shell (Node/npm not available). All pre-push checks are static analysis only — errors only surface at Vercel build time.

---

## Still to Build

| Feature | Notes |
|---------|-------|
| Curriculum Map (`/curriculum`) | Browse topics by qualification → exam board → category; see resource gaps |
| Parent Report Generator | PDF progress report per student, email to parent |
| Automated Parent Comms | Weekly summary emails triggered post-session or on schedule |
| Google Calendar OAuth | Wire up `GOOGLE_CLIENT_ID/SECRET` to real OAuth flow in `/api/calendar/sync` |
| `GET /api/topics` | List topics with filters (foundation for curriculum map) |
| `GET /api/dashboard/stats` | Expose dashboard data as API endpoint |
