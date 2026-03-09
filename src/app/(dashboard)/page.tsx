import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatCurrency, getStatusBadge } from "@/lib/constants";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("company_id, role, team_id")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  // Get all active jobs (not invoiced)
  const { data: activeJobs } = await supabase
    .from("jobs")
    .select("id, client_name, description, status, team_id, quoted_total, actual_total")
    .eq("company_id", profile.company_id)
    .neq("status", "invoiced")
    .order("updated_at", { ascending: false });

  // Get teams for labels
  const { data: teams } = await supabase
    .from("teams")
    .select("id, name")
    .eq("company_id", profile.company_id);

  const teamMap = new Map((teams ?? []).map((t) => [t.id, t.name]));

  const jobs = activeJobs ?? [];

  // Stats
  const totalActiveJobs = jobs.length;
  const totalQuoted = jobs.reduce((sum, j) => sum + (j.quoted_total ?? 0), 0);
  const totalActual = jobs.reduce((sum, j) => sum + (j.actual_total ?? 0), 0);
  const totalProfit = totalQuoted - totalActual;
  const overallMargin = totalQuoted > 0 ? (totalProfit / totalQuoted) * 100 : 0;

  // Count by status
  const statusCounts: Record<string, number> = {};
  jobs.forEach((j) => {
    statusCounts[j.status] = (statusCounts[j.status] ?? 0) + 1;
  });

  // Jobs needing attention (over budget or within 10%)
  const atRiskJobs = jobs.filter((j) => {
    if (j.actual_total === 0 || j.quoted_total === 0) return false;
    const margin = ((j.quoted_total - j.actual_total) / j.quoted_total) * 100;
    return margin < 10;
  });

  const isOwnerOrManager = ["owner", "manager"].includes(profile.role);
  const canSeeCosts = profile.role !== "operative";

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900">Dashboard</h2>
        {isOwnerOrManager && (
          <Link
            href="/jobs/new"
            className="min-h-[44px] flex items-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            New job
          </Link>
        )}
      </div>

      {/* Stats cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-xs font-medium uppercase text-slate-400">Active Jobs</div>
          <div className="mt-1 text-3xl font-bold text-slate-900">{totalActiveJobs}</div>
          <div className="mt-1 flex flex-wrap gap-1">
            {["quoted", "booked", "in_progress", "complete"].map((s) => {
              const count = statusCounts[s];
              if (!count) return null;
              const badge = getStatusBadge(s);
              return (
                <span key={s} className={`inline-block rounded-full px-2 py-0.5 text-xs ${badge.color}`}>
                  {count} {badge.label.toLowerCase()}
                </span>
              );
            })}
          </div>
        </div>
        {canSeeCosts && (
          <>
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="text-xs font-medium uppercase text-slate-400">Total Quoted</div>
              <div className="mt-1 text-3xl font-bold text-slate-900">{formatCurrency(totalQuoted)}</div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="text-xs font-medium uppercase text-slate-400">Total Actual</div>
              <div className="mt-1 text-3xl font-bold text-slate-900">{formatCurrency(totalActual)}</div>
            </div>
            <div className={`rounded-lg border-2 p-4 ${
              totalActual === 0
                ? "border-slate-200 bg-white"
                : overallMargin >= 10
                  ? "border-green-300 bg-green-50"
                  : overallMargin >= 0
                    ? "border-amber-300 bg-amber-50"
                    : "border-red-300 bg-red-50"
            }`}>
              <div className="text-xs font-medium uppercase text-slate-400">Overall Profit</div>
              <div className={`mt-1 text-3xl font-bold ${
                totalActual === 0
                  ? "text-slate-400"
                  : overallMargin >= 10
                    ? "text-green-600"
                    : overallMargin >= 0
                      ? "text-amber-600"
                      : "text-red-600"
              }`}>
                {formatCurrency(totalProfit)}
              </div>
              {totalActual > 0 && (
                <div className="mt-1 text-sm text-slate-500">
                  {overallMargin >= 0 ? "+" : ""}{overallMargin.toFixed(1)}% margin
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* At-risk jobs */}
      {canSeeCosts && atRiskJobs.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <span className="inline-block h-2 w-2 rounded-full bg-red-500"></span>
            Jobs needing attention ({atRiskJobs.length})
          </h3>
          <div className="grid gap-2">
            {atRiskJobs.map((job) => {
              const margin = ((job.quoted_total - job.actual_total) / job.quoted_total) * 100;
              const isOver = margin < 0;
              return (
                <Link
                  key={job.id}
                  href={`/jobs/${job.id}`}
                  className={`flex items-center justify-between gap-3 rounded-lg border-2 px-4 py-3 ${
                    isOver ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"
                  } hover:shadow-sm`}
                >
                  <div className="min-w-0 flex-1">
                    <span className="font-medium text-slate-900">{job.client_name}</span>
                    <span className="ml-2 hidden text-sm text-slate-500 sm:inline">{job.description}</span>
                    <p className="mt-0.5 truncate text-sm text-slate-500 sm:hidden">{job.description}</p>
                  </div>
                  <div className={`shrink-0 text-sm font-bold ${isOver ? "text-red-600" : "text-amber-600"}`}>
                    {margin >= 0 ? "+" : ""}{margin.toFixed(1)}%
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* All active jobs */}
      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">Active Jobs</h3>
          <Link href="/jobs" className="text-sm text-slate-500 hover:text-slate-900">
            View all &rarr;
          </Link>
        </div>
        {jobs.length === 0 ? (
          <p className="text-sm text-slate-500">No active jobs. Create your first job to get started.</p>
        ) : (
          <div className="grid gap-2">
            {jobs.map((job) => {
              const margin = job.quoted_total > 0
                ? ((job.quoted_total - job.actual_total) / job.quoted_total) * 100
                : 0;
              const badge = getStatusBadge(job.status);

              const trafficLight =
                job.actual_total === 0
                  ? "bg-slate-300"
                  : margin >= 10
                    ? "bg-green-500"
                    : margin >= 0
                      ? "bg-amber-500"
                      : "bg-red-500";

              return (
                <Link
                  key={job.id}
                  href={`/jobs/${job.id}`}
                  className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 hover:border-slate-300 hover:shadow-sm"
                >
                  {/* Traffic light dot */}
                  {canSeeCosts && <span className={`h-3 w-3 shrink-0 rounded-full ${trafficLight}`}></span>}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium text-slate-900">{job.client_name}</span>
                      <span className={`inline-block shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${badge.color}`}>
                        {badge.label}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-400">
                      {job.team_id && <span>{teamMap.get(job.team_id)}</span>}
                      <span className="truncate">{job.description}</span>
                    </div>
                  </div>

                  {canSeeCosts && (
                    <div className="shrink-0 text-right">
                      <div className="text-sm font-medium text-slate-900">{formatCurrency(job.quoted_total)}</div>
                      {job.actual_total > 0 && (
                        <div className={`text-xs font-bold ${
                          margin >= 10 ? "text-green-600" : margin >= 0 ? "text-amber-600" : "text-red-600"
                        }`}>
                          {margin >= 0 ? "+" : ""}{margin.toFixed(1)}%
                        </div>
                      )}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
