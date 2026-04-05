import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type StudentInsert = Database["public"]["Tables"]["students"]["Insert"];

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

  let query = supabase
    .from("students")
    .select("*, tutor:profiles!assigned_tutor_id(id, full_name)")
    .order("full_name");

  if (profile?.role !== "admin") {
    query = query.eq("assigned_tutor_id", user.id) as typeof query;
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ students: data });
}

export async function POST(request: NextRequest) {
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
  const payload: StudentInsert = {
    full_name: body.full_name,
    year_group: body.year_group,
    exam_board: body.exam_board,
    qualification: body.qualification,
    tier: body.tier ?? null,
    current_grade: body.current_grade ?? null,
    target_grade: body.target_grade,
    assigned_tutor_id: body.assigned_tutor_id ?? null,
    parent_name: body.parent_name ?? null,
    parent_email: body.parent_email ?? null,
    parent_phone: body.parent_phone ?? null,
    notes: body.notes ?? null,
    status: body.status ?? "active",
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("students")
    .insert(payload)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ student: data }, { status: 201 });
}
