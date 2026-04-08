import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import StudentList from "./StudentList";
import NavBar from "@/components/NavBar";

type StudentRow = {
  id: string; full_name: string; year_group: number; exam_board: string;
  qualification: string; tier: string | null; current_grade: string | null;
  target_grade: string; status: string; assigned_tutor_id: string | null;
  payment_status: string | null;
  tutor: { full_name: string } | null;
};
type TopicComboRow = { id: string; qualification: string; exam_board: string; tier: string | null };
type ProgressComboRow = { student_id: string; status: string };

export default async function StudentsPage() {
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

  // Fetch students with tutor name
  let studentsQuery = supabase
    .from("students")
    .select("id, full_name, year_group, exam_board, qualification, tier, current_grade, target_grade, status, assigned_tutor_id, payment_status, tutor:profiles!assigned_tutor_id(full_name)")
    .order("full_name");

  if (!isAdmin) {
    studentsQuery = studentsQuery.eq("assigned_tutor_id", user.id) as typeof studentsQuery;
  }

  const { data: studentsRaw } = await studentsQuery;
  const students = (studentsRaw ?? []) as unknown as StudentRow[];

  // Fetch all topics (count per curriculum combo)
  const { data: topicsRaw } = await supabase
    .from("topics")
    .select("id, qualification, exam_board, tier");
  const topics = (topicsRaw ?? []) as unknown as TopicComboRow[];

  // Fetch all progress (covered + mastered only) for count
  const { data: progressRaw } = await supabase
    .from("student_topic_progress")
    .select("student_id, status")
    .in("status", ["covered", "mastered"]);
  const allProgress = (progressRaw ?? []) as unknown as ProgressComboRow[];

  // Build topic count lookup: "GCSE:Edexcel:Foundation" -> count
  const topicCountByCombo: Record<string, number> = {};
  for (const t of topics ?? []) {
    const key = `${t.qualification}:${t.exam_board}:${t.tier ?? "null"}`;
    topicCountByCombo[key] = (topicCountByCombo[key] ?? 0) + 1;
  }

  // Build covered count per student
  const coveredByStudent: Record<string, number> = {};
  for (const p of allProgress ?? []) {
    coveredByStudent[p.student_id] = (coveredByStudent[p.student_id] ?? 0) + 1;
  }

  // Attach progress % to each student
  const studentsWithProgress = students.map((s) => {
    let totalTopics = 0;
    if (s.qualification === "A-Level") {
      totalTopics = topicCountByCombo[`${s.qualification}:${s.exam_board}:null`] ?? 0;
    } else if (s.tier === "Foundation") {
      totalTopics = topicCountByCombo[`${s.qualification}:${s.exam_board}:Foundation`] ?? 0;
    } else if (s.tier === "Higher") {
      totalTopics =
        (topicCountByCombo[`${s.qualification}:${s.exam_board}:Foundation`] ?? 0) +
        (topicCountByCombo[`${s.qualification}:${s.exam_board}:Higher`] ?? 0);
    }
    const covered = coveredByStudent[s.id] ?? 0;
    const progressPct = totalTopics > 0 ? Math.round((covered / totalTopics) * 100) : 0;
    return { ...s, progressPct, covered, totalTopics };
  });

  // Fetch tutors for filter (admin only)
  const { data: tutors } = isAdmin
    ? await supabase.from("profiles").select("id, full_name").eq("role", "tutor")
    : { data: [] };

  return (
    <div className="min-h-screen bg-[#0F172A]">
      <NavBar />

      <div className="max-w-6xl mx-auto px-4 py-6">
        <StudentList
          students={studentsWithProgress}
          tutors={tutors ?? []}
          isAdmin={isAdmin}
        />
      </div>
    </div>
  );
}
