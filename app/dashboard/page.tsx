import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import NavBar from "@/components/NavBar";

// ─── Types ────────────────────────────────────────────────────────────────────

type StudentRow = {
  id: string;
  full_name: string;
  exam_board: string;
  qualification: string;
  tier: string | null;
  assigned_tutor_id: string | null;
  tutor: { full_name: string } | null;
};

type SessionRow = {
  id: string;
  student_id: string;
  tutor_id: string;
  session_date: string;
  session_type: string;
  student_engagement: string | null;
  comprehension: string | null;
  topics_covered: string[];
  student: { full_name: string } | null;
  tutor: { full_name: string } | null;
};

type ProgressRow = { student_id: string; status: string };
type TopicRow = { qualification: string; exam_board: string; tier: string | null };
type TutorRow = { id: string; full_name: string };

type AtRiskReason =
  | { type: "inactive"; label: string }
  | { type: "no_session"; label: string }
  | { type: "engagement"; label: string }
  | { type: "progress"; label: string };

type AtRiskStudent = StudentRow & {
  reasons: AtRiskReason[];
  lastSessionDate: string | null;
  progressPct: number;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getWeekStart() {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split("T")[0];
}

function getMonthStart() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function getDaysAgo(n: number) {
  const d = new Date(Date.now() - n * 24 * 60 * 60 * 1000);
  return d.toISOString().split("T")[0];
}

function topicKey(q: string, e: string, t: string | null) {
  return `${q}:${e}:${t ?? "null"}`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single<{ role: string; full_name: string }>();

  if (profile?.role !== "admin") redirect("/tutor");

  const weekStart = getWeekStart();
  const monthStart = getMonthStart();
  const sevenDaysAgo = getDaysAgo(7);

  // Run all queries in parallel
  const [
    { count: activeStudentCount },
    { count: sessionsThisWeek },
    { count: sessionsThisMonth },
    { data: studentsRaw },
    { data: allSessionsRaw },
    { data: progressRaw },
    { data: topicsRaw },
    { data: tutorsRaw },
    { data: allTopicsMapRaw },
  ] = await Promise.all([
    supabase
      .from("students")
      .select("*", { count: "exact", head: true })
      .eq("status", "active"),
    supabase
      .from("session_logs")
      .select("*", { count: "exact", head: true })
      .gte("session_date", weekStart),
    supabase
      .from("session_logs")
      .select("*", { count: "exact", head: true })
      .gte("session_date", monthStart),
    supabase
      .from("students")
      .select("id, full_name, exam_board, qualification, tier, assigned_tutor_id, tutor:profiles!assigned_tutor_id(full_name)")
      .eq("status", "active")
      .order("full_name"),
    supabase
      .from("session_logs")
      .select("id, student_id, tutor_id, session_date, session_type, student_engagement, comprehension, topics_covered, student:students(full_name), tutor:profiles!tutor_id(full_name)")
      .order("session_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("student_topic_progress")
      .select("student_id, status")
      .in("status", ["covered", "mastered"]),
    supabase
      .from("topics")
      .select("qualification, exam_board, tier"),
    supabase
      .from("profiles")
      .select("id, full_name")
      .eq("role", "tutor")
      .order("full_name"),
    supabase
      .from("topics")
      .select("id, name"),
  ]);

  const students = (studentsRaw ?? []) as unknown as StudentRow[];
  const allSessions = (allSessionsRaw ?? []) as unknown as SessionRow[];
  const allProgress = (progressRaw ?? []) as unknown as ProgressRow[];
  const topics = (topicsRaw ?? []) as unknown as TopicRow[];
  const tutors = (tutorsRaw ?? []) as unknown as TutorRow[];
  const topicNameMap = Object.fromEntries(
    ((allTopicsMapRaw ?? []) as unknown as { id: string; name: string }[]).map((t) => [t.id, t.name])
  );

  // ── Build lookups ────────────────────────────────────────────────────────

  // Topic counts per curriculum combo
  const topicCountByCombo: Record<string, number> = {};
  for (const t of topics) {
    const key = topicKey(t.qualification, t.exam_board, t.tier);
    topicCountByCombo[key] = (topicCountByCombo[key] ?? 0) + 1;
  }

  // Covered count per student
  const coveredByStudent: Record<string, number> = {};
  for (const p of allProgress) {
    coveredByStudent[p.student_id] = (coveredByStudent[p.student_id] ?? 0) + 1;
  }

  // Last session per student
  const lastSessionByStudent: Record<string, SessionRow> = {};
  for (const s of allSessions) {
    if (!lastSessionByStudent[s.student_id]) {
      lastSessionByStudent[s.student_id] = s;
    }
  }

  // ── Compute progress % per student ──────────────────────────────────────

  function studentProgress(s: StudentRow): number {
    let total = 0;
    if (s.qualification === "A-Level") {
      total = topicCountByCombo[topicKey(s.qualification, s.exam_board, null)] ?? 0;
    } else if (s.tier === "Foundation") {
      total = topicCountByCombo[topicKey(s.qualification, s.exam_board, "Foundation")] ?? 0;
    } else if (s.tier === "Higher") {
      total =
        (topicCountByCombo[topicKey(s.qualification, s.exam_board, "Foundation")] ?? 0) +
        (topicCountByCombo[topicKey(s.qualification, s.exam_board, "Higher")] ?? 0);
    }
    return total > 0 ? Math.round(((coveredByStudent[s.id] ?? 0) / total) * 100) : 0;
  }

  // ── At-risk students ─────────────────────────────────────────────────────

  const atRisk: AtRiskStudent[] = [];

  for (const student of students) {
    const reasons: AtRiskReason[] = [];
    const lastSession = lastSessionByStudent[student.id];
    const pct = studentProgress(student);

    if (!lastSession) {
      reasons.push({ type: "no_session", label: "No session logged yet" });
    } else {
      const daysSince = Math.floor(
        (Date.now() - new Date(lastSession.session_date).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSince >= 7) {
        reasons.push({
          type: "inactive",
          label: `${daysSince} day${daysSince !== 1 ? "s" : ""} since last session`,
        });
      }
      if (lastSession.student_engagement === "poor") {
        reasons.push({ type: "engagement", label: "Poor engagement last session" });
      }
    }

    if (pct < 50) {
      reasons.push({ type: "progress", label: `${pct}% curriculum covered` });
    }

    if (reasons.length > 0) {
      atRisk.push({
        ...student,
        reasons,
        lastSessionDate: lastSession?.session_date ?? null,
        progressPct: pct,
      });
    }
  }

  // Sort: most reasons first
  atRisk.sort((a, b) => b.reasons.length - a.reasons.length);

  // ── Tutor leaderboard ───────────────────────────────────────────────────

  const tutorSessionCount: Record<string, number> = {};
  const tutorLastActive: Record<string, string> = {};

  for (const s of allSessions) {
    if (s.session_date >= weekStart) {
      tutorSessionCount[s.tutor_id] = (tutorSessionCount[s.tutor_id] ?? 0) + 1;
    }
    if (!tutorLastActive[s.tutor_id] || s.session_date > tutorLastActive[s.tutor_id]) {
      tutorLastActive[s.tutor_id] = s.session_date;
    }
  }

  const leaderboard = tutors
    .map((t) => ({
      ...t,
      sessionsThisWeek: tutorSessionCount[t.id] ?? 0,
      lastActive: tutorLastActive[t.id] ?? null,
    }))
    .sort((a, b) => b.sessionsThisWeek - a.sessionsThisWeek);

  // ── Recent sessions (last 10) ────────────────────────────────────────────

  const recentSessions = allSessions.slice(0, 10);

  // ── Students with no session in 7+ days (for inactive badge) ────────────
  const inactiveCount = students.filter((s) => {
    const last = lastSessionByStudent[s.id];
    return !last || last.session_date < sevenDaysAgo;
  }).length;

  return (
    <div className="min-h-screen bg-[#0F172A]">
      <NavBar />

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Page title */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[#F8FAFC] text-xl font-bold">Dashboard</h1>
            <p className="text-[#94A3B8] text-sm mt-0.5">
              {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
            </p>
          </div>
          <Link
            href="/log-session"
            className="px-4 py-2 rounded-lg bg-[#F97316] hover:bg-[#FB923C] text-white text-sm font-medium transition-colors"
          >
            + Log Session
          </Link>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Active Students"
            value={activeStudentCount ?? 0}
            sub="currently enrolled"
            colour="text-[#3B82F6]"
          />
          <StatCard
            label="Sessions This Week"
            value={sessionsThisWeek ?? 0}
            sub={`since Monday`}
            colour="text-[#F97316]"
          />
          <StatCard
            label="Sessions This Month"
            value={sessionsThisMonth ?? 0}
            sub={new Date().toLocaleDateString("en-GB", { month: "long" })}
            colour="text-emerald-400"
          />
          <StatCard
            label="At Risk"
            value={atRisk.length}
            sub={`${inactiveCount} inactive 7d+`}
            colour={atRisk.length > 0 ? "text-red-400" : "text-[#475569]"}
            alert={atRisk.length > 0}
          />
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column — 2/3 */}
          <div className="lg:col-span-2 space-y-6">
            {/* At-risk students */}
            <Section title="Students at Risk" count={atRisk.length} countColour="text-red-400">
              {atRisk.length === 0 ? (
                <EmptyState icon="✓" text="No students flagged — everything looks good" />
              ) : (
                <div className="divide-y divide-[#334155]">
                  {atRisk.map((s) => (
                    <Link
                      key={s.id}
                      href={`/students/${s.id}`}
                      className="flex items-start justify-between gap-3 px-4 py-3 hover:bg-[#334155]/30 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-[#F8FAFC] font-medium text-sm truncate">{s.full_name}</p>
                        <p className="text-[#475569] text-xs mt-0.5">
                          {s.qualification} {s.exam_board}
                          {s.tutor ? ` · ${s.tutor.full_name}` : ""}
                          {s.lastSessionDate
                            ? ` · Last seen ${new Date(s.lastSessionDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`
                            : ""}
                        </p>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {s.reasons.map((r, i) => (
                            <RiskBadge key={i} reason={r} />
                          ))}
                        </div>
                      </div>
                      <span className="text-[#475569] text-xs flex-shrink-0 mt-0.5">
                        {s.progressPct}%
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </Section>

            {/* Recent sessions */}
            <Section title="Recent Sessions" count={recentSessions.length}>
              {recentSessions.length === 0 ? (
                <EmptyState icon="📋" text="No sessions logged yet" />
              ) : (
                <div className="divide-y divide-[#334155]">
                  {recentSessions.map((s) => (
                    <div key={s.id} className="px-4 py-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-[#F8FAFC] text-sm font-medium truncate">
                            {(s.student as { full_name: string } | null)?.full_name ?? "Unknown"}
                          </p>
                          <span className="text-xs px-1.5 py-0.5 rounded bg-[#334155] text-[#94A3B8] capitalize">
                            {s.session_type.replace("_", " ")}
                          </span>
                        </div>
                        <p className="text-[#475569] text-xs mt-0.5">
                          {(s.tutor as { full_name: string } | null)?.full_name ?? ""}
                          {s.student_engagement && (
                            <span className={`ml-2 ${ENGAGEMENT_COLOUR[s.student_engagement] ?? ""}`}>
                              {s.student_engagement}
                            </span>
                          )}
                          {s.comprehension && (
                            <span className={`ml-2 ${COMPREHENSION_COLOUR[s.comprehension] ?? ""}`}>
                              · {s.comprehension}
                            </span>
                          )}
                        </p>
                        {s.topics_covered.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {s.topics_covered.slice(0, 3).map((tid) => (
                              <span key={tid} className="text-xs px-1.5 py-0.5 rounded bg-[#1E3A5F]/60 text-[#3B82F6]">
                                {topicNameMap[tid] ?? "Topic"}
                              </span>
                            ))}
                            {s.topics_covered.length > 3 && (
                              <span className="text-xs text-[#475569]">
                                +{s.topics_covered.length - 3} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <span className="text-[#475569] text-xs flex-shrink-0 mt-0.5">
                        {new Date(s.session_date).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <div className="px-4 py-3 border-t border-[#334155]">
                <Link href="/students" className="text-xs text-[#3B82F6] hover:text-[#60A5FA] transition-colors">
                  View all students →
                </Link>
              </div>
            </Section>
          </div>

          {/* Right column — 1/3 */}
          <div className="space-y-6">
            {/* Tutor leaderboard */}
            <Section title="Tutors This Week">
              {leaderboard.length === 0 ? (
                <EmptyState icon="👥" text="No tutors yet" />
              ) : (
                <div className="divide-y divide-[#334155]">
                  {leaderboard.map((t, i) => (
                    <div key={t.id} className="px-4 py-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-[#475569] text-xs w-4 flex-shrink-0">{i + 1}</span>
                        <div className="min-w-0">
                          <p className="text-[#F8FAFC] text-sm font-medium truncate">{t.full_name}</p>
                          <p className="text-[#475569] text-xs">
                            {t.lastActive
                              ? `Last: ${new Date(t.lastActive).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`
                              : "No sessions yet"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`text-sm font-bold ${t.sessionsThisWeek > 0 ? "text-[#F97316]" : "text-[#475569]"}`}>
                          {t.sessionsThisWeek}
                        </p>
                        <p className="text-[#475569] text-xs">sessions</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {/* Quick links */}
            <Section title="Quick Actions">
              <div className="p-4 space-y-2">
                {[
                  { href: "/students", label: "View All Students", icon: "👥" },
                  { href: "/log-session", label: "Log a Session", icon: "📝" },
                  { href: "/students", label: "Add New Student", icon: "➕" },
                ].map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#334155] transition-colors group"
                  >
                    <span className="text-base">{link.icon}</span>
                    <span className="text-[#94A3B8] group-hover:text-[#F8FAFC] text-sm transition-colors">
                      {link.label}
                    </span>
                  </Link>
                ))}
              </div>
            </Section>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  colour,
  alert,
}: {
  label: string;
  value: number;
  sub: string;
  colour: string;
  alert?: boolean;
}) {
  return (
    <div className={`bg-[#1E293B] border rounded-xl p-4 ${alert ? "border-red-500/30" : "border-[#334155]"}`}>
      <p className="text-[#475569] text-xs font-medium uppercase tracking-wide">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${colour}`}>{value}</p>
      <p className="text-[#475569] text-xs mt-1">{sub}</p>
    </div>
  );
}

function Section({
  title,
  count,
  countColour,
  children,
}: {
  title: string;
  count?: number;
  countColour?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[#1E293B] border border-[#334155] rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-[#334155] flex items-center gap-2">
        <h2 className="text-[#F8FAFC] font-semibold text-sm">{title}</h2>
        {count !== undefined && (
          <span className={`text-xs font-medium ${countColour ?? "text-[#475569]"}`}>
            ({count})
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="px-4 py-8 text-center">
      <span className="text-2xl">{icon}</span>
      <p className="text-[#475569] text-sm mt-2">{text}</p>
    </div>
  );
}

const RISK_COLOURS: Record<string, string> = {
  no_session: "bg-red-500/10 text-red-400 border-red-500/20",
  inactive: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  engagement: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  progress: "bg-blue-500/10 text-blue-400 border-blue-500/20",
};

function RiskBadge({ reason }: { reason: AtRiskReason }) {
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs border ${RISK_COLOURS[reason.type] ?? ""}`}>
      {reason.label}
    </span>
  );
}

const ENGAGEMENT_COLOUR: Record<string, string> = {
  excellent: "text-emerald-400",
  good: "text-blue-400",
  average: "text-amber-400",
  poor: "text-red-400",
};

const COMPREHENSION_COLOUR: Record<string, string> = {
  mastered: "text-amber-400",
  confident: "text-emerald-400",
  developing: "text-blue-400",
  struggling: "text-red-400",
};
