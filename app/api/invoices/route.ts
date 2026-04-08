import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
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

  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get("student_id");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabaseAny = supabase as any;
  let query = supabaseAny
    .from("invoices")
    .select("*, student:students!student_id(full_name, assigned_tutor_id)")
    .order("created_at", { ascending: false });

  if (studentId) {
    query = query.eq("student_id", studentId);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Tutors can only see invoices for their own students
  const filtered = isAdmin
    ? data
    : // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (data ?? []).filter((inv: any) => inv.student?.assigned_tutor_id === user.id);

  return NextResponse.json({ invoices: filtered });
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
  const { student_id, amount, status, due_date, notes } = body;

  if (!student_id || !amount || !due_date) {
    return NextResponse.json(
      { error: "student_id, amount and due_date are required" },
      { status: 400 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("invoices")
    .insert({ student_id, amount, status: status ?? "draft", due_date, notes: notes ?? null })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ invoice: data }, { status: 201 });
}
