import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NavBar from "@/components/NavBar";
import TrainingView from "./TrainingView";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = Record<string, any>;

export default async function TrainingPage() {
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabaseAny = supabase as any;

  const { data: modulesRaw } = await supabaseAny
    .from("training_modules")
    .select("*")
    .order("order_index");

  const { data: progressRaw } = await supabaseAny
    .from("tutor_training_progress")
    .select("module_id, status, completed_at")
    .eq("tutor_id", user.id);

  const modules = (modulesRaw ?? []) as unknown as AnyRow[];
  const progress = (progressRaw ?? []) as unknown as AnyRow[];

  return (
    <div className="min-h-screen bg-[#0F172A]">
      <NavBar />
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <TrainingView
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          modules={modules as any}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          progress={progress as any}
          isAdmin={isAdmin}
          tutorId={user.id}
        />
      </div>
    </div>
  );
}
