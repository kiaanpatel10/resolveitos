import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NavBar from "@/components/NavBar";
import TutorList from "./TutorList";

function getWeekStart() {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split("T")[0];
}

export default async function TutorsPage() {
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

  const weekStart = getWeekStart();

  const [{ data: tutorsRaw }, { data: studentsRaw }, { data: sessionsRaw }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, email, phone, created_at")
        .eq("role", "tutor")
        .order("full_name"),
      supabase
        .from("students")
        .select("id, assigned_tutor_id")
        .not("assigned_tutor_id", "is", null),
      supabase
        .from("session_logs")
        .select("tutor_id, session_date")
        .order("session_date", { ascending: false }),
    ]);

  type TutorRaw = { id: string; full_name: string; email: string; phone: string | null; created_at: string };
  type StudentRaw = { id: string; assigned_tutor_id: string | null };
  type SessionRaw = { tutor_id: string; session_date: string };

  const tutors = (tutorsRaw ?? []) as unknown as TutorRaw[];
  const students = (studentsRaw ?? []) as unknown as StudentRaw[];
  const sessions = (sessionsRaw ?? []) as unknown as SessionRaw[];

  // Student count per tutor
  const studentCountByTutor: Record<string, number> = {};
  for (const s of students) {
    if (s.assigned_tutor_id) {
      studentCountByTutor[s.assigned_tutor_id] = (studentCountByTutor[s.assigned_tutor_id] ?? 0) + 1;
    }
  }

  // Sessions this week + last active per tutor
  const sessionsThisWeekByTutor: Record<string, number> = {};
  const lastActiveByTutor: Record<string, string> = {};
  for (const s of sessions) {
    if (s.session_date >= weekStart) {
      sessionsThisWeekByTutor[s.tutor_id] = (sessionsThisWeekByTutor[s.tutor_id] ?? 0) + 1;
    }
    if (!lastActiveByTutor[s.tutor_id] || s.session_date > lastActiveByTutor[s.tutor_id]) {
      lastActiveByTutor[s.tutor_id] = s.session_date;
    }
  }

  const enrichedTutors = tutors.map((t) => ({
    ...t,
    studentCount: studentCountByTutor[t.id] ?? 0,
    sessionsThisWeek: sessionsThisWeekByTutor[t.id] ?? 0,
    lastActive: lastActiveByTutor[t.id] ?? null,
  }));

  return (
    <div className="min-h-screen bg-[#0F172A]">
      <NavBar />
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-[#F8FAFC] text-xl font-bold">Tutors</h1>
          <p className="text-[#94A3B8] text-sm mt-0.5">Manage your tutor team</p>
        </div>

        <TutorList tutors={enrichedTutors} />
      </div>
    </div>
  );
}
