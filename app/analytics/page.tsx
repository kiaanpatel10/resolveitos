import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NavBar from "@/components/NavBar";
import AnalyticsView from "./AnalyticsView";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = Record<string, any>;

export default async function AnalyticsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single<{ role: string }>();

  if (profile?.role !== "admin") redirect("/tutor");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabaseAny = supabase as any;

  // Session logs with joined data — last 90 days
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const cutoff = ninetyDaysAgo.toISOString().split("T")[0];

  const { data: sessionsRaw } = await supabaseAny
    .from("session_logs")
    .select(
      "id, session_date, duration_minutes, topics_covered, student_engagement, comprehension, tutor_id, student_id, student_ids, tutor:profiles!tutor_id(id, full_name), student:students!student_id(id, full_name, curriculum)"
    )
    .gte("session_date", cutoff)
    .order("session_date", { ascending: true });

  // All tutors
  const { data: tutorsRaw } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "tutor")
    .order("full_name");

  // All active students
  const { data: studentsRaw } = await supabase
    .from("students")
    .select("id, full_name, curriculum, status, assigned_tutor_id")
    .eq("status", "active")
    .order("full_name");

  // Student topic progress
  const { data: progressRaw } = await supabaseAny
    .from("student_topic_progress")
    .select("student_id, topic, status, last_session_date");

  const sessions = (sessionsRaw ?? []) as unknown as AnyRow[];
  const tutors = (tutorsRaw ?? []) as unknown as AnyRow[];
  const students = (studentsRaw ?? []) as unknown as AnyRow[];
  const progress = (progressRaw ?? []) as unknown as AnyRow[];

  return (
    <div className="min-h-screen bg-[#0F172A]">
      <NavBar />
      <div className="max-w-7xl mx-auto px-4 py-6">
        <AnalyticsView
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          sessions={sessions as any}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          tutors={tutors as any}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          students={students as any}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          progress={progress as any}
        />
      </div>
    </div>
  );
}
