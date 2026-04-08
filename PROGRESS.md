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
| `students` | Student records with curriculum info, grades, parent contact |
| `topics` | Curriculum backbone — ~170 topics seeded across GCSE + A-Level |
| `session_logs` | Every tutoring session logged by tutors |
| `student_topic_progress` | Auto-updated by DB trigger when a session is logged |
| `resources` | Worksheet/resource library (table exists, UI not built yet) |
| `assessments` | Mock exams and test scores (table exists, UI not built yet) |

**DB trigger:** `update_student_topic_progress` — fires on every `INSERT` into `session_logs`, automatically upserts `student_topic_progress` for each topic covered, increments `times_covered`, updates `latest_comprehension` and `last_covered_date`.

**Curriculum seeded:** GCSE (Foundation + Higher) for Edexcel and AQA. A-Level (Pure, Statistics, Mechanics) for Edexcel, AQA, and OCR.

**RLS policies:** Admins see everything. Tutors see only their assigned students, their own sessions, and their students' progress.

---

### Pages Built

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
- Shows: name, year, curriculum, current → target grade, tutor, progress bar %, status badge
- Mobile card layout
- **Add Student modal** (admin only): full form with name, year, qualification, exam board, tier (GCSE only), grades, tutor assignment, parent contact, notes. Saves via `POST /api/students`, refreshes list on success

#### `/students/[id]`
- **Header card:** Name, status, qualification, exam board, tier, tutor, current → target grade, progress bar
- **Progress tab:** Topic chips grouped by category, colour-coded (grey = not started, green = covered, gold = mastered). Hover tooltip shows times covered + comprehension. Per-category counts
- **Sessions tab:** Reverse-chronological session cards — date, type, duration, tutor, topics covered (resolved from UUIDs), engagement + comprehension ratings, notes, homework
- **Details tab:** Student info display + parent contact. Admin can edit: current/target grade, status, tutor assignment, parent info, notes. Saves via `PUT /api/students/[id]`

#### `/log-session`
- Student picker (tutors see only their students, admins see all)
- Date picker (defaults to today)
- Session type selector (Regular / Mock Review / Diagnostic / Revision)
- Duration slider (30–120 mins in 15-min steps)
- Searchable topic multi-select filtered to student's exam board + qualification, grouped by category, selected topics shown as removable chips
- One-tap engagement buttons (Excellent / Good / Average / Poor)
- One-tap comprehension buttons (Mastered / Confident / Developing / Struggling)
- Session notes + homework free-text fields
- On submit: `POST /api/sessions` → DB trigger fires → student progress auto-updated → success toast → form resets

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

#### `/resources`
- Search bar + 5 filters (qualification, exam board, type, difficulty)
- Resource grid cards with type badge, difficulty stars, download link
- Admin upload modal: file to Supabase Storage + metadata (type, difficulty, topic link, exam board)

---

### API Routes Built
| Method | Route | Notes |
|--------|-------|-------|
| `POST` | `/api/auth/logout` | Signs out and redirects to `/login` |
| `GET` | `/api/students` | Role-filtered student list |
| `POST` | `/api/students` | Admin only — creates student |
| `GET` | `/api/students/[id]` | Single student |
| `PUT` | `/api/students/[id]` | Update student details |
| `GET` | `/api/sessions` | Sessions (role-filtered, filterable by student) |
| `POST` | `/api/sessions` | Log a session — trigger handles progress update |

---

---

### Phase 3: Payments & Revenue

#### Payment Status on Students ✅ BUILT
- `payment_status` ('paid'/'overdue'/'trial'/'free') and `monthly_rate` fields added to students table
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
- `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` env vars added to `.env.local`
- Placeholder webhook handler at `POST /api/stripe/webhook`

#### Nav Updates ✅ BUILT
- Invoices and Revenue links added to admin nav

---

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
- ICS file generation for all schedule types
- Placeholder OAuth endpoint at `POST /api/calendar/sync` (returns 501)
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` env vars added

#### Tutor Training Hub (`/training`) ✅ BUILT
- `training_modules` table: title, type (sop/video/document), content (markdown), order_index
- `tutor_training_progress` table: tutor_id, module_id, status, completed_at
- **`/training`** page: module grid cards with type badge, status chip, progress bar
- Module detail modal: SOP renders markdown via minimal regex renderer, video shows iframe, document shows download link
- Tutors can mark in_progress/completed; admins can create/edit/delete modules
- 4 seeded modules: Session Delivery SOP, How to Log a Session, Communication Standards, Exam Board Overview
- API: `GET/POST /api/training`, `PATCH/DELETE /api/training/[id]`, `GET/POST /api/training/progress`

#### Group Session Support ✅ BUILT
- `student_ids UUID[]` column added to `session_logs` (migration 008)
- Existing rows backfilled: `student_ids = ARRAY[student_id]`
- DB trigger updated to loop over `student_ids` array (falls back to `student_id`)
- `SessionLogForm` rewritten: multi-select student picker with search, curriculum validation when adding 2nd+ student
- Submit sends both `student_id` (primary) and `student_ids` to API
- API route updated to persist `student_ids`

#### Analytics Dashboard (`/analytics`) ✅ BUILT (admin only)
- Pure SVG charts (no chart library): bar chart + line chart components
- **Session volume**: weekly line chart (last 90 days)
- **Topic frequency**: top-15 topics by session count (bar chart)
- **Topic difficulty**: avg comprehension by topic, ascending sort (bar chart)
- **Tutor effectiveness**: table with sessions, avg engagement, avg comprehension, colour-coded scores
- **Engagement trend**: weekly avg engagement line chart
- **Curriculum coverage**: per-curriculum progress bars (covered/mastered/total topics)
- Tutor filter dropdown to slice all charts by individual tutor
- Summary stats: sessions, hours delivered, avg engagement, unique students

#### Nav Updates ✅ BUILT
- Schedule + Training added to both admin and tutor nav
- Analytics added to admin nav only

---

## What's Left to Build

### MVP Gaps (should finish before onboarding tutors)

#### ~~`/tutor` — Tutor home page~~ ✅ BUILT
- Welcome message with first name
- Stats: total students, sessions this week, sessions this month
- Active student cards with progress bar (2-col grid, links to /students/[id])
- Paused/inactive students section (collapsed below)
- Recent 10 sessions with engagement colour, topic chips
- Log Session CTA button

#### ~~`/tutors` — Tutor management (admin only)~~ ✅ BUILT
- Table (desktop) / cards (mobile) listing tutors with: name, email, student count, sessions this week, last active
- "Add Tutor" modal — creates Supabase auth user + profile row via service role key
- `/tutors/[id]` detail page: tutor header with stats, assigned students list, recent sessions
- Assign/unassign students inline on the detail page
- Admin-only — redirects tutors to /tutor

#### Missing API routes
| Method | Route | Purpose | Status |
|--------|-------|---------|--------|
| `GET` | `/api/tutors` | List tutors (admin only) | ✅ Built |
| `POST` | `/api/tutors` | Create tutor account | ✅ Built |
| `GET` | `/api/tutors/[id]` | Tutor profile with students/sessions | ✅ Built |
| `PATCH` | `/api/tutors/[id]` | Assign/unassign students | ✅ Built |
| `GET` | `/api/resources` | List resources with filters | ✅ Built |
| `POST` | `/api/resources` | Upload resource to Supabase Storage | ✅ Built |
| `POST` | `/api/assessments` | Log assessment | ✅ Built |
| `GET` | `/api/assessments/[studentId]` | Get assessments for student | ✅ Built |
| `GET` | `/api/topics` | List topics with filters | Not yet |
| `GET` | `/api/dashboard/stats` | Expose dashboard data as API | Not yet |

---

### Phase 2 (post-MVP, per spec)

#### ~~Resource Library (`/resources`)~~ ✅ BUILT
- Grid view with search + filter (qualification, exam board, type, difficulty)
- Resource cards: title, linked topic, type badge, difficulty stars, exam board, download link
- Admin upload modal: file upload to Supabase Storage bucket ("resources") + metadata form
- Tutors can browse and download, not upload
- Each resource linkable to a curriculum topic
- **Requires:** Supabase Storage bucket named "resources" to be created and set to public

#### ~~Assessment Tracking~~ ✅ BUILT
- "Assessments" tab added to student profiles (4th tab)
- Log Assessment modal: type (mock/diagnostic/topic_test), title, date, score, max_score, grade, notes
- Assessment history (reverse-chronological) with score %, grade, type badge
- Grade progression SVG line chart (appears when ≥2 graded assessments exist)
- Admin dashboard "Recent Assessments" widget shows last 5 across all students

#### Curriculum Map (`/curriculum`) — admin reference
- Browse all topics by qualification → exam board → category
- See which topics have resources attached
- Identify resource coverage gaps

#### Parent Report Generator
- Auto-generate a progress report PDF per student
- Show topics covered, grades, session history summary
- Send via email to parent

#### Tutor Performance Scorecards
- Sessions delivered per week/month
- Engagement + comprehension averages across their students
- Comparison against targets

#### Scheduling System
- Upcoming session calendar
- Flag students with no session booked

#### Automated Parent Comms
- Weekly progress summary emails to parents
- Triggered after sessions or on a schedule

---

## Known Issues / Tech Debt
- The new Supabase publishable/secret key format causes TypeScript inference to return `never` for query results — worked around with `as any` casts in server components. Will resolve cleanly if Supabase updates their TypeScript types for the new key format.
- `/resources` upload requires a Supabase Storage bucket named **"resources"** with public access enabled. Must be created manually in Supabase dashboard before uploads work.
- `/tutors/[id]` is a client component (uses `useEffect` + fetch) rather than a server component — avoids auth middleware complexity on dynamic client pages.
- Grade progression chart only appears when the student has ≥2 assessments with a grade set.
