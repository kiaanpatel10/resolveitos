import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NavBar from "@/components/NavBar";
import RevenueView from "./RevenueView";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = Record<string, any>;

export default async function RevenuePage() {
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

  if (profile?.role !== "admin") redirect("/tutor");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabaseAny = supabase as any;

  // All invoices
  const { data: invoicesRaw } = await supabaseAny
    .from("invoices")
    .select("id, amount, status, due_date, paid_date, created_at")
    .order("created_at", { ascending: true });
  const invoices = (invoicesRaw ?? []) as unknown as AnyRow[];

  // Students with payment_status and monthly_rate (active only)
  const { data: studentsRaw } = await supabase
    .from("students")
    .select("id, full_name, payment_status, monthly_rate")
    .eq("status", "active");
  const students = (studentsRaw ?? []) as unknown as AnyRow[];

  return (
    <div className="min-h-screen bg-[#0F172A]">
      <NavBar />
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <RevenueView invoices={invoices as any} students={students as any} />
      </div>
    </div>
  );
}
