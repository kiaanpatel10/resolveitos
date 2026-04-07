import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type AssessmentInsert = Database["public"]["Tables"]["assessments"]["Insert"];

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { student_id, type, title, date_taken, score, max_score, grade, topics_tested, notes } = body;

  if (!student_id || !type || !title || !date_taken) {
    return NextResponse.json(
      { error: "student_id, type, title and date_taken are required" },
      { status: 400 }
    );
  }

  const payload: AssessmentInsert = {
    student_id,
    type,
    title,
    date_taken,
    score: score ?? null,
    max_score: max_score ?? null,
    grade: grade || null,
    topics_tested: topics_tested ?? null,
    notes: notes || null,
    logged_by: user.id,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("assessments")
    .insert(payload)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ assessment: data }, { status: 201 });
}
