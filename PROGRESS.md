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
- Placeholder page only — tutors land here after login

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

## What's Left to Build

### MVP Gaps (should finish before onboarding tutors)

#### `/tutor` — Tutor home page
The current page is a placeholder. Tutors need a useful landing page showing:
- Their assigned students with progress
- Quick link to log a session
- Their own recent session history

#### `/tutors` — Tutor management (admin only)
Per the spec:
- List of all tutors with assigned student count, session count, last active
- Ability to add new tutors (currently you have to create users in Supabase manually)
- Click through to see a tutor's students and session history

#### Missing API routes
| Method | Route | Purpose |
|--------|-------|---------|
| `GET` | `/api/tutors` | List tutors (admin only) |
| `GET` | `/api/topics` | List topics with filters |
| `GET` | `/api/dashboard/stats` | Expose dashboard data as API |

---

### Phase 2 (post-MVP, per spec)

#### Resource Library (`/resources`)
- Grid/list of worksheets, past papers, mark schemes, notes, videos
- Filter by topic, qualification, exam board, difficulty, type
- Admin uploads (file + metadata → Supabase Storage)
- Tutors browse and download
- Each resource linked to a curriculum topic
- Requires: Supabase Storage bucket setup

#### Assessment Tracking
- Log mock exams, diagnostics, topic tests against students
- Score + grade tracking over time
- Grade progression chart on student profile (Assessments tab — currently placeholder)
- `POST /api/assessments` and `GET /api/assessments/[studentId]` routes needed

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
- `/tutor` is a placeholder — tutors currently have no useful UI after login.
- No "Add Tutor" UI — tutors must be created manually in Supabase Auth dashboard, then their `profiles.role` must be set via SQL.
