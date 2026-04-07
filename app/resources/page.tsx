import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NavBar from "@/components/NavBar";
import ResourceLibrary from "./ResourceLibrary";

export default async function ResourcesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single<{ role: string }>();

  const isAdmin = profile?.role === "admin";

  const [{ data: resourcesRaw }, { data: topicsRaw }] = await Promise.all([
    supabase
      .from("resources")
      .select("*, topic:topics(name, category)")
      .order("created_at", { ascending: false }),
    supabase
      .from("topics")
      .select("id, name, category, qualification, exam_board")
      .order("category")
      .order("name"),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resources = (resourcesRaw ?? []) as unknown as any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const topics = (topicsRaw ?? []) as unknown as any[];

  return (
    <div className="min-h-screen bg-[#0F172A]">
      <NavBar />
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-[#F8FAFC] text-xl font-bold">Resource Library</h1>
          <p className="text-[#94A3B8] text-sm mt-0.5">
            Worksheets, past papers, mark schemes and notes
          </p>
        </div>

        <ResourceLibrary resources={resources} topics={topics} isAdmin={isAdmin} />
      </div>
    </div>
  );
}
