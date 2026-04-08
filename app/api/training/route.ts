import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: modules, error } = await (supabase as any)
    .from("training_modules")
    .select("*")
    .order("order_index");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fetch this user's progress
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: progress } = await (supabase as any)
    .from("tutor_training_progress")
    .select("module_id, status, completed_at")
    .eq("tutor_id", user.id);

  return NextResponse.json({ modules: modules ?? [], progress: progress ?? [] });
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
  const { title, description, type, content_url, content, order_index, required } = body;

  if (!title || !type) {
    return NextResponse.json({ error: "title and type are required" }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("training_modules")
    .insert({ title, description: description ?? null, type, content_url: content_url ?? null, content: content ?? null, order_index: order_index ?? 0, required: required ?? false })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ module: data }, { status: 201 });
}
