export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ClockControls } from "./clock-controls";

export default async function ClockPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("company_id")
    .eq("id", user.id)
    .single();

  if (!profile?.company_id) redirect("/login");

  // Check for active clock-in (no clock_out)
  const { data: activeEntry } = await supabase
    .from("time_entries")
    .select("id, clock_in, job_id")
    .eq("user_id", user.id)
    .is("clock_out", null)
    .maybeSingle();

  // Get active jobs for the dropdown
  const { data: jobs } = await supabase
    .from("jobs")
    .select("id, client_name")
    .eq("company_id", profile.company_id)
    .in("status", ["booked", "in_progress"])
    .order("client_name");

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">Clock In / Out</h2>
        <Link
          href="/timesheet"
          className="text-sm text-slate-500 hover:text-slate-900"
        >
          View timesheet &rarr;
        </Link>
      </div>

      {params.error && (
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          {params.error}
        </div>
      )}

      <ClockControls activeEntry={activeEntry} jobs={jobs ?? []} />
    </div>
  );
}
