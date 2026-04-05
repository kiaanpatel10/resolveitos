import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type SessionInsert = Database["public"]["Tables"]["session_logs"]["Insert"];

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  const {
    student_id,
    session_date,
    session_type,
    duration_minutes,
    topics_covered,
    student_engagement,
    comprehension,
    session_notes,
    homework_set,
  } = body;

  // Validate required fields
  if (!student_id || !topics_covered?.length) {
    return NextResponse.json(
      { error: "student_id and topics_covered are required" },
      { status: 400 }
    );
  }

  const insertPayload: SessionInsert = {
    tutor_id: user.id,
    student_id,
    session_date: session_date || new Date().toISOString().split("T")[0],
    session_type: session_type || "regular",
    duration_minutes: duration_minutes || 60,
    topics_covered,
    student_engagement: student_engagement || null,
    comprehension: comprehension || null,
    session_notes: session_notes || null,
    homework_set: homework_set || null,
  };

  // Insert session — DB trigger handles progress updates automatically
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("session_logs")
    .insert(insertPayload)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ session: data }, { status: 201 });
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get("student_id");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single<{ role: string }>();

  let query = supabase
    .from("session_logs")
    .select("*, students(full_name), profiles(full_name)")
    .order("session_date", { ascending: false });

  // Tutors can only see their own sessions
  if (profile?.role !== "admin") {
    query = query.eq("tutor_id", user.id);
  }

  if (studentId) {
    query = query.eq("student_id", studentId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ sessions: data });
}
