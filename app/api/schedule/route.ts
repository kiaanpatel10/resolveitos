import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
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

  const isAdmin = profile?.role === "admin";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabaseAny = supabase as any;
  let query = supabaseAny
    .from("schedule")
    .select("*, tutor:profiles!tutor_id(id, full_name), student:students!student_id(id, full_name)")
    .eq("status", "active")
    .order("day_of_week")
    .order("start_time");

  if (!isAdmin) {
    query = query.eq("tutor_id", user.id);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ schedule: data ?? [] });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { tutor_id, student_id, day_of_week, start_time, duration_minutes, recurring, notes } = body;

  if (!student_id || !day_of_week || !start_time) {
    return NextResponse.json(
      { error: "student_id, day_of_week and start_time are required" },
      { status: 400 }
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single<{ role: string }>();

  const isAdmin = profile?.role === "admin";
  const effectiveTutorId = isAdmin ? (tutor_id ?? user.id) : user.id;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("schedule")
    .insert({
      tutor_id: effectiveTutorId,
      student_id,
      day_of_week,
      start_time,
      duration_minutes: duration_minutes ?? 60,
      recurring: recurring ?? true,
      notes: notes ?? null,
    })
    .select("*, tutor:profiles!tutor_id(id, full_name), student:students!student_id(id, full_name)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ entry: data }, { status: 201 });
}
