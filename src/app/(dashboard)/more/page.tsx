export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { logout } from "@/app/(auth)/actions";

export default async function MorePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("name, role, company_id")
    .eq("id", user.id)
    .single();

  const isOwnerOrManager = profile?.role === "owner" || profile?.role === "manager";

  const linkClass =
    "flex min-h-[52px] items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 active:bg-slate-50";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">{profile?.name}</h2>
        <p className="text-sm text-slate-500">{profile?.role?.replace("_", " ")}</p>
      </div>

      <div className="space-y-2">
        <Link href="/clock" className={linkClass}>
          <span>Clock In / Out</span>
          <span className="text-slate-400">&rsaquo;</span>
        </Link>
        <Link href="/timesheet" className={linkClass}>
          <span>Timesheet</span>
          <span className="text-slate-400">&rsaquo;</span>
        </Link>
        <Link href="/updates" className={linkClass}>
          <span>Daily Updates</span>
          <span className="text-slate-400">&rsaquo;</span>
        </Link>
        <Link href="/calendar" className={linkClass}>
          <span>Calendar</span>
          <span className="text-slate-400">&rsaquo;</span>
        </Link>
      </div>

      {isOwnerOrManager && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase text-slate-400">Management</h3>
          <Link href="/price-list" className={linkClass}>
            <span>Price List</span>
            <span className="text-slate-400">&rsaquo;</span>
          </Link>
          <Link href="/teams" className={linkClass}>
            <span>Teams</span>
            <span className="text-slate-400">&rsaquo;</span>
          </Link>
          <Link href="/members" className={linkClass}>
            <span>Members</span>
            <span className="text-slate-400">&rsaquo;</span>
          </Link>
        </div>
      )}

      <form action={logout}>
        <button
          type="submit"
          className="min-h-[52px] w-full rounded-lg border border-red-200 bg-white px-4 py-3 text-sm font-medium text-red-600 active:bg-red-50"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
