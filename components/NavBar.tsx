import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import NavLinks from "./NavLinks";

export default async function NavBar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("role, full_name")
        .eq("id", user.id)
        .single<{ role: string; full_name: string }>()
    : { data: null };

  const isAdmin = profile?.role === "admin";

  return (
    <div className="border-b border-[#334155] bg-[#1E293B]">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-5">
          <Link href={isAdmin ? "/dashboard" : "/tutor"} className="flex items-center gap-2 flex-shrink-0">
            <div className="w-7 h-7 rounded-md bg-[#F97316] flex items-center justify-center">
              <span className="text-white font-bold text-xs">R</span>
            </div>
            <span className="text-[#F8FAFC] font-semibold text-sm hidden sm:block">ResolveIt OS</span>
          </Link>

          {/* Nav links */}
          <NavLinks isAdmin={isAdmin} />
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <span className="text-[#94A3B8] text-xs hidden sm:block">{profile?.full_name}</span>
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="text-xs text-[#475569] hover:text-[#94A3B8] transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
