import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NavBar from "@/components/NavBar";
import InvoiceList from "./InvoiceList";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = Record<string, any>;

export default async function InvoicesPage() {
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

  const { data: invoicesRaw } = await supabaseAny
    .from("invoices")
    .select("id, amount, status, due_date, paid_date, notes, created_at, student:students!student_id(id, full_name)")
    .order("created_at", { ascending: false });

  const invoices = (invoicesRaw ?? []) as unknown as AnyRow[];

  const { data: studentsRaw } = await supabase
    .from("students")
    .select("id, full_name")
    .eq("status", "active")
    .order("full_name");
  const students = (studentsRaw ?? []) as unknown as { id: string; full_name: string }[];

  return (
    <div className="min-h-screen bg-[#0F172A]">
      <NavBar />
      <div className="max-w-5xl mx-auto px-4 py-6">
        <InvoiceList
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          invoices={invoices as any}
          students={students}
        />
      </div>
    </div>
  );
}
