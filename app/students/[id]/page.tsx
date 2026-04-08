import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import StudentProfile from "./StudentProfile";
import NavBar from "@/components/NavBar";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = Record<string, any>;

export default async function StudentProfilePage({
  params,
}: {
  params: { id: string };
}) {
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

  const isAdmin = profile?.role === "admin";

  // Fetch student
  const { data: studentRaw, error } = await supabase
    .from("students")
    .select("*, tutor:profiles!assigned_tutor_id(id, full_name)")
    .eq("id", params.id)
    .single();

  if (error || !studentRaw) notFound();
  const student = studentRaw as unknown as AnyRow;

  // Access check: tutors can only view their own students
  if (!isAdmin && student.assigned_tutor_id !== user.id) {
    redirect("/students");
  }

  // Fetch topics for this student's curriculum
  let topicsQuery = supabase
    .from("topics")
    .select("id, name, category, qualification, exam_board, tier, difficulty, order_index")
    .eq("qualification", student.qualification)
    .eq("exam_board", student.exam_board)
    .order("category")
    .order("order_index");

  if (student.qualification === "A-Level") {
    topicsQuery = topicsQuery.is("tier", null) as typeof topicsQuery;
  } else if (student.tier === "Foundation") {
    topicsQuery = topicsQuery.eq("tier", "Foundation") as typeof topicsQuery;
  } else if (student.tier === "Higher") {
    topicsQuery = topicsQuery.in("tier", ["Foundation", "Higher"]) as typeof topicsQuery;
  }

  const { data: topicsRaw } = await topicsQuery;
  const topics = (topicsRaw ?? []) as unknown as AnyRow[];

  // Fetch progress for this student
  const { data: progressRaw } = await supabase
    .from("student_topic_progress")
    .select("topic_id, status, times_covered, latest_comprehension, last_covered_date")
    .eq("student_id", params.id);
  const progress = (progressRaw ?? []) as unknown as AnyRow[];

  // Fetch session history (last 50)
  const { data: sessionsRaw } = await supabase
    .from("session_logs")
    .select("*, tutor:profiles!tutor_id(full_name)")
    .eq("student_id", params.id)
    .order("session_date", { ascending: false })
    .limit(50);
  const sessions = (sessionsRaw ?? []) as unknown as AnyRow[];

  // All topics map for resolving IDs in session history
  const { data: allTopicsRaw } = await supabase
    .from("topics")
    .select("id, name, category");
  const allTopics = (allTopicsRaw ?? []) as unknown as AnyRow[];

  // Fetch tutors for details editing (admin only)
  const { data: tutorsRaw } = isAdmin
    ? await supabase.from("profiles").select("id, full_name").eq("role", "tutor")
    : { data: [] };
  const tutors = (tutorsRaw ?? []) as unknown as { id: string; full_name: string }[];

  // Fetch assessments for this student
  const { data: assessmentsRaw } = await supabase
    .from("assessments")
    .select("*")
    .eq("student_id", params.id)
    .order("date_taken", { ascending: true });
  const assessments = (assessmentsRaw ?? []) as unknown as AnyRow[];

  // Fetch invoices for this student
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabaseAny = supabase as any;
  const { data: invoicesRaw } = await supabaseAny
    .from("invoices")
    .select("id, amount, status, due_date, paid_date, notes, created_at")
    .eq("student_id", params.id)
    .order("created_at", { ascending: false });
  const invoices = (invoicesRaw ?? []) as unknown as AnyRow[];

  return (
    <div className="min-h-screen bg-[#0F172A]">
      <NavBar />

      {/* Breadcrumb */}
      <div className="max-w-4xl mx-auto px-4 pt-4 flex items-center gap-2 text-sm">
        <Link href="/students" className="text-[#94A3B8] hover:text-[#F8FAFC] transition-colors">Students</Link>
        <span className="text-[#475569]">/</span>
        <span className="text-[#F8FAFC] font-medium">{student.full_name}</span>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-4">
        <StudentProfile
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          student={student as any}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          topics={topics as any}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          progress={progress as any}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          sessions={sessions as any}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          allTopics={allTopics as any}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          assessments={assessments as any}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          invoices={invoices as any}
          tutors={tutors}
          isAdmin={isAdmin}
        />
      </div>
    </div>
  );
}
