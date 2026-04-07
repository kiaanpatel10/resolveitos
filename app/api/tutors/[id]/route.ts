import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
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

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const [
    { data: tutorProfile },
    { data: students },
    { data: sessions },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, phone, created_at")
      .eq("id", params.id)
      .single(),
    supabase
      .from("students")
      .select("id, full_name, year_group, qualification, exam_board, tier, target_grade, status")
      .eq("assigned_tutor_id", params.id)
      .order("full_name"),
    supabase
      .from("session_logs")
      .select("id, session_date, session_type, duration_minutes, student_engagement, comprehension, student:students(full_name)")
      .eq("tutor_id", params.id)
      .order("session_date", { ascending: false })
      .limit(20),
  ]);

  if (!tutorProfile) {
    return NextResponse.json({ error: "Tutor not found" }, { status: 404 });
  }

  return NextResponse.json({ tutor: tutorProfile, students, sessions });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
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

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const body = await request.json();
  // Assign/unassign students: body.assign = studentId, body.unassign = studentId
  if (body.assign) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("students")
      .update({ assigned_tutor_id: params.id })
      .eq("id", body.assign);
  }
  if (body.unassign) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("students")
      .update({ assigned_tutor_id: null })
      .eq("id", body.unassign);
  }

  return NextResponse.json({ ok: true });
}
