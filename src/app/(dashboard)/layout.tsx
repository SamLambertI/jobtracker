export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { logout } from "../(auth)/actions";
import Link from "next/link";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("name, role, company_id")
    .eq("id", user.id)
    .single();

  let companyName = "Job Tracker";
  if (profile?.company_id) {
    const { data: company } = await supabase
      .from("companies")
      .select("name")
      .eq("id", profile.company_id)
      .single();
    if (company) companyName = company.name;
  }

  const isOwnerOrManager = profile?.role === "owner" || profile?.role === "manager";

  return (
    <div className="min-h-screen bg-slate-50 pb-16 sm:pb-0">
      {/* Desktop header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <div>
              <h1 className="text-lg font-bold text-slate-900">{companyName}</h1>
              <p className="text-xs text-slate-500">
                {profile?.name} &middot; {profile?.role?.replace("_", " ")}
              </p>
            </div>
            {/* Desktop nav */}
            <nav className="hidden items-center gap-1 sm:flex">
              <Link
                href="/"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                Dashboard
              </Link>
              <Link
                href="/calendar"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                Calendar
              </Link>
              <Link
                href="/jobs"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                Jobs
              </Link>
              <Link
                href="/updates"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                Updates
              </Link>
              <Link
                href="/timesheet"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                Timesheet
              </Link>
              {isOwnerOrManager && (
                <>
                  <Link
                    href="/price-list"
                    className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  >
                    Price List
                  </Link>
                  <Link
                    href="/teams"
                    className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  >
                    Teams
                  </Link>
                  <Link
                    href="/members"
                    className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  >
                    Members
                  </Link>
                </>
              )}
            </nav>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>

      {/* Mobile bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white sm:hidden">
        <div className="flex items-stretch justify-around">
          <Link
            href="/"
            className="flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 py-2 text-slate-500 active:bg-slate-50"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
            <span className="text-[10px] font-medium">Home</span>
          </Link>
          <Link
            href="/calendar"
            className="flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 py-2 text-slate-500 active:bg-slate-50"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
            <span className="text-[10px] font-medium">Calendar</span>
          </Link>
          <Link
            href="/jobs"
            className="flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 py-2 text-slate-500 active:bg-slate-50"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" />
            </svg>
            <span className="text-[10px] font-medium">Jobs</span>
          </Link>
          <Link
            href="/timesheet"
            className="flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 py-2 text-slate-500 active:bg-slate-50"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-[10px] font-medium">Time</span>
          </Link>
          <Link
            href="/more"
            className="flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 py-2 text-slate-500 active:bg-slate-50"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
            <span className="text-[10px] font-medium">More</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
