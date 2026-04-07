import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const qualification = searchParams.get("qualification");
  const examBoard = searchParams.get("exam_board");
  const fileType = searchParams.get("file_type");
  const topicId = searchParams.get("topic_id");

  let query = supabase
    .from("resources")
    .select("*, topic:topics(name, category)")
    .order("created_at", { ascending: false });

  if (qualification) query = query.eq("qualification", qualification) as typeof query;
  if (examBoard) query = query.eq("exam_board", examBoard) as typeof query;
  if (fileType) query = query.eq("file_type", fileType) as typeof query;
  if (topicId) query = query.eq("topic_id", topicId) as typeof query;

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ resources: data });
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

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const title = formData.get("title") as string;
  const description = formData.get("description") as string | null;
  const fileType = formData.get("file_type") as string;
  const topicId = formData.get("topic_id") as string | null;
  const qualification = formData.get("qualification") as string | null;
  const examBoard = formData.get("exam_board") as string | null;
  const difficulty = formData.get("difficulty") as string | null;

  if (!title || !fileType) {
    return NextResponse.json({ error: "title and file_type are required" }, { status: 400 });
  }

  let fileUrl = "";

  if (file && file.size > 0) {
    const adminSupabase = await createAdminClient();
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const safeFileName = `${Date.now()}-${file.name.replace(/\s+/g, "-")}`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: uploadError } = await (adminSupabase as any).storage
      .from("resources")
      .upload(safeFileName, buffer, { contentType: file.type, upsert: false });

    if (uploadError) {
      return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: urlData } = (adminSupabase as any).storage
      .from("resources")
      .getPublicUrl(safeFileName);

    fileUrl = urlData?.publicUrl ?? "";
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("resources")
    .insert({
      title,
      description: description || null,
      file_url: fileUrl,
      file_type: fileType,
      topic_id: topicId || null,
      qualification: qualification || null,
      exam_board: examBoard || null,
      difficulty: difficulty ? parseInt(difficulty, 10) : null,
      uploaded_by: user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ resource: data }, { status: 201 });
}
