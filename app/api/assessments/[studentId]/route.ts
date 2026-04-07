import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: { studentId: string } }
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single<{ role: string }>();

  // Tutors can only see assessments for their assigned students
  if (profile?.role !== "admin") {
    const { data: student } = await supabase
      .from("students")
      .select("assigned_tutor_id")
      .eq("id", params.studentId)
      .single<{ assigned_tutor_id: string | null }>();

    if (student?.assigned_tutor_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const { data, error } = await supabase
    .from("assessments")
    .select("*")
    .eq("student_id", params.studentId)
    .order("date_taken", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ assessments: data });
}
