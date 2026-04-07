import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import NavBar from "@/components/NavBar";

type StudentRow = {
  id: string;
  full_name: string;
  year_group: number;
  exam_board: string;
  qualification: string;
  tier: string | null;
  target_grade: string;
  current_grade: string | null;
  status: string;
};

type SessionRow = {
  id: string;
  session_date: string;
  session_type: string;
  duration_minutes: number;
  student_engagement: string | null;
  topics_covered: string[];
  student: { full_name: string } | null;
};

const ENGAGEMENT_COLOUR: Record<string, string> = {
  excellent: "text-emerald-400",
  good: "text-blue-400",
  average: "text-amber-400",
  poor: "text-red-400",
};

function getWeekStart() {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split("T")[0];
}

function getMonthStart() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function topicKey(q: string, e: string, t: string | null) {
  return `${q}:${e}:${t ?? "null"}`;
}

export default async function TutorPage() {
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

  if (profile?.role === "admin") redirect("/dashboard");

  const weekStart = getWeekStart();
  const monthStart = getMonthStart();

  const [
    { data: studentsRaw },
    { data: sessionsRaw },
    { count: sessionsThisWeek },
    { count: sessionsThisMonth },
    { data: progressRaw },
    { data: topicsRaw },
    { data: topicNamesRaw },
  ] = await Promise.all([
    supabase
      .from("students")
      .select("id, full_name, year_group, exam_board, qualification, tier, target_grade, current_grade, status")
      .eq("assigned_tutor_id", user.id)
      .order("full_name"),
    supabase
      .from("session_logs")
      .select("id, session_date, session_type, duration_minutes, student_engagement, topics_covered, student:students(full_name)")
      .eq("tutor_id", user.id)
      .order("session_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("session_logs")
      .select("*", { count: "exact", head: true })
      .eq("tutor_id", user.id)
      .gte("session_date", weekStart),
    supabase
      .from("session_logs")
      .select("*", { count: "exact", head: true })
      .eq("tutor_id", user.id)
      .gte("session_date", monthStart),
    supabase
      .from("student_topic_progress")
      .select("student_id, status")
      .in("status", ["covered", "mastered"]),
    supabase.from("topics").select("qualification, exam_board, tier"),
    supabase.from("topics").select("id, name"),
  ]);

  const students = (studentsRaw ?? []) as unknown as StudentRow[];
  const sessions = (sessionsRaw ?? []) as unknown as SessionRow[];
  const allProgress = (progressRaw ?? []) as unknown as { student_id: string; status: string }[];
  const topics = (topicsRaw ?? []) as unknown as { qualification: string; exam_board: string; tier: string | null }[];
  const topicNameMap = Object.fromEntries(
    ((topicNamesRaw ?? []) as unknown as { id: string; name: string }[]).map((t) => [t.id, t.name])
  );

  const topicCountByCombo: Record<string, number> = {};
  for (const t of topics) {
    const key = topicKey(t.qualification, t.exam_board, t.tier);
    topicCountByCombo[key] = (topicCountByCombo[key] ?? 0) + 1;
  }

  const coveredByStudent: Record<string, number> = {};
  for (const p of allProgress) {
    coveredByStudent[p.student_id] = (coveredByStudent[p.student_id] ?? 0) + 1;
  }

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

  const activeStudents = students.filter((s) => s.status === "active");
  const inactiveStudents = students.filter((s) => s.status !== "active");

  return (
    <div className="min-h-screen bg-[#0F172A]">
      <NavBar />
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[#F8FAFC] text-xl font-bold">
              Welcome back, {profile?.full_name?.split(" ")[0] ?? "there"}
            </h1>
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

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <StatCard
            label="My Students"
            value={students.length}
            sub={`${activeStudents.length} active`}
            colour="text-[#3B82F6]"
          />
          <StatCard
            label="Sessions This Week"
            value={sessionsThisWeek ?? 0}
            sub="since Monday"
            colour="text-[#F97316]"
          />
          <StatCard
            label="Sessions This Month"
            value={sessionsThisMonth ?? 0}
            sub={new Date().toLocaleDateString("en-GB", { month: "long" })}
            colour="text-emerald-400"
          />
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Students — 2/3 */}
          <div className="lg:col-span-2 space-y-4">
            <Section title="My Students" count={activeStudents.length}>
              {activeStudents.length === 0 ? (
                <EmptyState icon="👥" text="No active students assigned yet" />
              ) : (
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activeStudents.map((s) => {
                    const pct = studentProgress(s);
                    return (
                      <Link
                        key={s.id}
                        href={`/students/${s.id}`}
                        className="bg-[#0F172A] border border-[#334155] rounded-xl p-4 hover:border-[#475569] transition-colors group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[#F8FAFC] font-medium text-sm truncate group-hover:text-[#F97316] transition-colors">
                              {s.full_name}
                            </p>
                            <p className="text-[#475569] text-xs mt-0.5">
                              Year {s.year_group} · {s.qualification} {s.exam_board}
                              {s.tier && s.tier !== "N/A" ? ` · ${s.tier}` : ""}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-[#475569] text-xs">Target</p>
                            <p className="text-[#F97316] font-bold text-sm">{s.target_grade}</p>
                          </div>
                        </div>
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-xs text-[#475569] mb-1">
                            <span>Progress</span>
                            <span className="text-[#F97316] font-medium">{pct}%</span>
                          </div>
                          <div className="h-1.5 bg-[#334155] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#F97316] rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </Section>

            {inactiveStudents.length > 0 && (
              <div className="bg-[#1E293B] border border-[#334155] rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-[#334155]">
                  <h3 className="text-[#94A3B8] font-medium text-sm">
                    Paused / Inactive ({inactiveStudents.length})
                  </h3>
                </div>
                <div className="divide-y divide-[#334155]">
                  {inactiveStudents.map((s) => (
                    <Link
                      key={s.id}
                      href={`/students/${s.id}`}
                      className="flex items-center justify-between px-4 py-3 hover:bg-[#334155]/30 transition-colors"
                    >
                      <div>
                        <p className="text-[#94A3B8] text-sm">{s.full_name}</p>
                        <p className="text-[#475569] text-xs">Year {s.year_group} · {s.qualification}</p>
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full border capitalize ${
                          s.status === "paused"
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                            : "bg-red-500/10 text-red-400 border-red-500/20"
                        }`}
                      >
                        {s.status}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Recent sessions — 1/3 */}
          <div>
            <Section title="Recent Sessions" count={sessions.length}>
              {sessions.length === 0 ? (
                <EmptyState icon="📋" text="No sessions logged yet" />
              ) : (
                <div className="divide-y divide-[#334155]">
                  {sessions.map((s) => (
                    <div key={s.id} className="px-4 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[#F8FAFC] text-sm font-medium truncate">
                          {(s.student as { full_name: string } | null)?.full_name ?? "Unknown"}
                        </p>
                        <span className="text-[#475569] text-xs flex-shrink-0">
                          {new Date(s.session_date).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-xs px-1.5 py-0.5 rounded bg-[#334155] text-[#94A3B8] capitalize">
                          {s.session_type.replace("_", " ")}
                        </span>
                        <span className="text-xs text-[#475569]">{s.duration_minutes}m</span>
                        {s.student_engagement && (
                          <span className={`text-xs ${ENGAGEMENT_COLOUR[s.student_engagement] ?? ""}`}>
                            {s.student_engagement}
                          </span>
                        )}
                      </div>
                      {s.topics_covered.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {s.topics_covered.slice(0, 2).map((tid) => (
                            <span
                              key={tid}
                              className="text-xs px-1.5 py-0.5 rounded bg-[#1E3A5F]/60 text-[#3B82F6]"
                            >
                              {topicNameMap[tid] ?? "Topic"}
                            </span>
                          ))}
                          {s.topics_covered.length > 2 && (
                            <span className="text-xs text-[#475569]">
                              +{s.topics_covered.length - 2}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <div className="px-4 py-3 border-t border-[#334155]">
                <Link
                  href="/log-session"
                  className="text-xs text-[#3B82F6] hover:text-[#60A5FA] transition-colors"
                >
                  Log a new session →
                </Link>
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
}: {
  label: string;
  value: number;
  sub: string;
  colour: string;
}) {
  return (
    <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-4">
      <p className="text-[#475569] text-xs font-medium uppercase tracking-wide">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${colour}`}>{value}</p>
      <p className="text-[#475569] text-xs mt-1">{sub}</p>
    </div>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[#1E293B] border border-[#334155] rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-[#334155] flex items-center gap-2">
        <h2 className="text-[#F8FAFC] font-semibold text-sm">{title}</h2>
        {count !== undefined && (
          <span className="text-xs font-medium text-[#475569]">({count})</span>
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
