import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NavBar from "@/components/NavBar";
import ScheduleView from "./ScheduleView";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = Record<string, any>;

export default async function SchedulePage() {
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabaseAny = supabase as any;

  // Fetch active schedule entries
  let scheduleQuery = supabaseAny
    .from("schedule")
    .select("*, tutor:profiles!tutor_id(id, full_name), student:students!student_id(id, full_name)")
    .eq("status", "active")
    .order("start_time");

  if (!isAdmin) {
    scheduleQuery = scheduleQuery.eq("tutor_id", user.id);
  }

  const { data: scheduleRaw } = await scheduleQuery;
  const scheduleEntries = (scheduleRaw ?? []) as unknown as AnyRow[];

  // Fetch tutors (admin) or just current user (tutor)
  const { data: tutorsRaw } = isAdmin
    ? await supabase.from("profiles").select("id, full_name").eq("role", "tutor").order("full_name")
    : { data: [{ id: user.id, full_name: profile?.full_name ?? "" }] };
  const tutors = (tutorsRaw ?? []) as unknown as { id: string; full_name: string }[];

  // Fetch students visible to this user
  let studentsQuery = supabase
    .from("students")
    .select("id, full_name, assigned_tutor_id")
    .eq("status", "active")
    .order("full_name");

  if (!isAdmin) {
    studentsQuery = studentsQuery.eq("assigned_tutor_id", user.id) as typeof studentsQuery;
  }

  const { data: studentsRaw } = await studentsQuery;
  const students = (studentsRaw ?? []) as unknown as { id: string; full_name: string; assigned_tutor_id: string | null }[];

  return (
    <div className="min-h-screen bg-[#0F172A]">
      <NavBar />
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <ScheduleView
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          schedule={scheduleEntries as any}
          tutors={tutors}
          students={students}
          isAdmin={isAdmin}
          currentUserId={user.id}
        />
      </div>
    </div>
  );
}
