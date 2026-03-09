import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatCurrency, getStatusBadge } from "@/lib/constants";

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; team?: string; status?: string }>;
}) {
  const { error, team: teamFilter, status: statusFilter } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("company_id, role, team_id")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  let query = supabase
    .from("jobs")
    .select("id, client_name, description, status, team_id, quoted_total, actual_total, start_date, created_at")
    .eq("company_id", profile.company_id)
    .order("created_at", { ascending: false });

  if (teamFilter) query = query.eq("team_id", teamFilter);
  if (statusFilter) query = query.eq("status", statusFilter);

  const { data: jobs } = await query;

  const { data: teams } = await supabase
    .from("teams")
    .select("id, name")
    .eq("company_id", profile.company_id)
    .order("name");

  const teamMap = new Map((teams ?? []).map((t) => [t.id, t.name]));

  const isOwnerOrManager = ["owner", "manager"].includes(profile.role);
  const canSeeCosts = profile.role !== "operative";

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900">Jobs</h2>
        {isOwnerOrManager && (
          <Link
            href="/jobs/new"
            className="min-h-[44px] flex items-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            New job
          </Link>
        )}
      </div>

      {error && (
        <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {/* Filters */}
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href="/jobs"
          className={`rounded-full px-3 py-1 text-sm ${!statusFilter && !teamFilter ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
        >
          All
        </Link>
        {["quoted", "booked", "in_progress", "complete", "invoiced"].map((s) => {
          const badge = getStatusBadge(s);
          return (
            <Link
              key={s}
              href={`/jobs?status=${s}${teamFilter ? `&team=${teamFilter}` : ""}`}
              className={`rounded-full px-3 py-1 text-sm ${statusFilter === s ? "bg-slate-900 text-white" : badge.color + " hover:opacity-80"}`}
            >
              {badge.label}
            </Link>
          );
        })}
      </div>

      {isOwnerOrManager && teams && teams.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {teams.map((t) => (
            <Link
              key={t.id}
              href={`/jobs?team=${t.id}${statusFilter ? `&status=${statusFilter}` : ""}`}
              className={`rounded-full px-3 py-1 text-xs ${teamFilter === t.id ? "bg-slate-700 text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100"}`}
            >
              {t.name}
            </Link>
          ))}
        </div>
      )}

      {(!jobs || jobs.length === 0) ? (
        <p className="mt-8 text-sm text-slate-500">No jobs found.</p>
      ) : (
        <div className="mt-6 grid gap-3">
          {jobs.map((job) => {
            const margin = job.quoted_total > 0
              ? ((job.quoted_total - job.actual_total) / job.quoted_total) * 100
              : 0;
            const badge = getStatusBadge(job.status);
            const marginColor =
              job.actual_total === 0
                ? "text-slate-400"
                : margin >= 10
                  ? "text-green-600"
                  : margin >= 0
                    ? "text-amber-600"
                    : "text-red-600";

            return (
              <Link
                key={job.id}
                href={`/jobs/${job.id}`}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 hover:border-slate-300 hover:shadow-sm"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-900 truncate">{job.client_name}</span>
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${badge.color}`}>
                      {badge.label}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-slate-500 truncate">{job.description}</p>
                  <div className="mt-1 flex items-center gap-3 text-xs text-slate-400">
                    {job.team_id && <span>{teamMap.get(job.team_id)}</span>}
                    {job.start_date && <span>{job.start_date}</span>}
                  </div>
                </div>
                {canSeeCosts && (
                  <div className="ml-4 text-right shrink-0">
                    <div className="text-sm font-medium text-slate-900">
                      {formatCurrency(job.quoted_total)}
                    </div>
                    {job.actual_total > 0 && (
                      <div className={`text-xs font-medium ${marginColor}`}>
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
  );
}
