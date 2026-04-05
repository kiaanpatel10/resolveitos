import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SessionLogForm from "./SessionLogForm";
import NavBar from "@/components/NavBar";
import type { Student, Topic } from "@/lib/supabase/types";

export default async function LogSessionPage() {
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

  // Fetch students (tutors only see their own)
  let studentsQuery = supabase
    .from("students")
    .select("id, full_name, exam_board, qualification, tier, status")
    .eq("status", "active")
    .order("full_name");

  if (!isAdmin) {
    studentsQuery = studentsQuery.eq("assigned_tutor_id", user.id) as typeof studentsQuery;
  }

  const { data: students } = await studentsQuery;

  // Fetch all topics
  const { data: topics } = await supabase
    .from("topics")
    .select("id, name, category, qualification, exam_board, tier, order_index")
    .order("order_index");

  return (
    <div className="min-h-screen bg-[#0F172A]">
      <NavBar />

      {/* Form */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-[#F8FAFC] text-xl font-semibold">Log Session</h1>
          <p className="text-[#94A3B8] text-sm mt-0.5">Fill this in right after the lesson</p>
        </div>

        <SessionLogForm
          students={(students as Pick<Student, "id" | "full_name" | "exam_board" | "qualification" | "tier" | "status">[]) ?? []}
          topics={(topics as Pick<Topic, "id" | "name" | "category" | "qualification" | "exam_board" | "tier" | "order_index">[]) ?? []}
        />
      </div>
    </div>
  );
}
