import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatCurrency, getStatusBadge, COST_CATEGORIES, STATUS_FLOW } from "@/lib/constants";
import { deleteJob, updateJobStatus } from "../actions";
import { ClockButton } from "./clock-button";

export default async function JobDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  const { data: job } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", id)
    .single();

  if (!job) redirect("/jobs");

  // Get team name
  let teamName: string | null = null;
  if (job.team_id) {
    const { data: team } = await supabase.from("teams").select("name").eq("id", job.team_id).single();
    teamName = team?.name ?? null;
  }

  // Check if user has an active clock-in on this job (no clock_out)
  const { data: activeTimeEntry } = await supabase
    .from("time_entries")
    .select("id, clock_in")
    .eq("job_id", id)
    .eq("user_id", user.id)
    .is("clock_out", null)
    .maybeSingle();

  // Get quoted costs grouped by category
  const { data: quotedCosts } = await supabase
    .from("quoted_costs")
    .select("*")
    .eq("job_id", id)
    .order("sort_order")
    .order("created_at");

  // Get actual costs grouped by category
  const { data: actualCosts } = await supabase
    .from("actual_costs")
    .select("*")
    .eq("job_id", id)
    .order("logged_at");

  const isOwnerOrManager = profile?.role === "owner" || profile?.role === "manager";
  const canEdit = isOwnerOrManager || profile?.role === "team_leader";
  const badge = getStatusBadge(job.status);
  const profit = job.quoted_total - job.actual_total;
  const marginPct = job.quoted_total > 0 ? (profit / job.quoted_total) * 100 : 0;
  const marginColor =
    job.actual_total === 0
      ? "text-slate-400"
      : marginPct >= 10
        ? "text-green-600"
        : marginPct >= 0
          ? "text-amber-600"
          : "text-red-600";

  const nextStatuses = STATUS_FLOW[job.status] ?? [];

  // Summarise costs by category
  const quotedByCategory = new Map<string, number>();
  (quotedCosts ?? []).forEach((c) => {
    quotedByCategory.set(c.category, (quotedByCategory.get(c.category) ?? 0) + (c.line_total ?? 0));
  });
  const actualByCategory = new Map<string, number>();
  (actualCosts ?? []).forEach((c) => {
    actualByCategory.set(c.category, (actualByCategory.get(c.category) ?? 0) + (c.line_total ?? 0));
  });

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Link href="/jobs" className="text-sm text-slate-400 hover:text-slate-600">&larr; Jobs</Link>
        </div>
        <h2 className="mt-1 text-xl font-semibold text-slate-900">{job.client_name}</h2>
        <p className="mt-0.5 text-sm text-slate-500">{job.description}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.color}`}>
            {badge.label}
          </span>
          {teamName && (
            <span className="text-xs text-slate-500">{teamName}</span>
          )}
          {job.start_date && (
            <span className="text-xs text-slate-400">{job.start_date}{job.end_date ? ` — ${job.end_date}` : ""}</span>
          )}
        </div>
        {/* Action buttons */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {nextStatuses.length > 0 && canEdit && (
            nextStatuses.map((s) => {
              const nextBadge = getStatusBadge(s);
              return (
                <form key={s} action={updateJobStatus}>
                  <input type="hidden" name="jobId" value={job.id} />
                  <input type="hidden" name="status" value={s} />
                  <button
                    type="submit"
                    className={`min-h-[44px] rounded-full px-4 py-2 text-sm font-medium ${nextBadge.color} hover:opacity-80`}
                  >
                    Move to {nextBadge.label}
                  </button>
                </form>
              );
            })
          )}
          {isOwnerOrManager && (
            <Link
              href={`/jobs/${job.id}/edit`}
              className="min-h-[44px] flex items-center rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Edit
            </Link>
          )}
          <ClockButton jobId={job.id} activeEntry={activeTimeEntry} />
        </div>
      </div>

      {/* Client info */}
      {(job.client_address || job.client_email || job.client_phone) && (
        <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="mb-2 text-sm font-semibold text-slate-700">Client</h3>
          <div className="grid gap-1 text-sm text-slate-600 sm:grid-cols-3">
            {job.client_address && <div>{job.client_address}</div>}
            {job.client_email && <div>{job.client_email}</div>}
            {job.client_phone && <div>{job.client_phone}</div>}
          </div>
        </div>
      )}

      {/* Profitability traffic light */}
      {job.actual_total > 0 && (
        <div className={`mt-4 rounded-lg border-2 p-4 ${
          marginPct >= 10
            ? "border-green-300 bg-green-50"
            : marginPct >= 0
              ? "border-amber-300 bg-amber-50"
              : "border-red-300 bg-red-50"
        }`}>
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-full text-xl ${
              marginPct >= 10
                ? "bg-green-500"
                : marginPct >= 0
                  ? "bg-amber-500"
                  : "bg-red-500"
            }`}>
              <span className="text-white font-bold text-sm">
                {marginPct >= 10 ? "+" : marginPct >= 0 ? "~" : "!"}
              </span>
            </div>
            <div>
              <div className={`text-lg font-bold ${marginColor}`}>
                {marginPct >= 0 ? "+" : ""}{marginPct.toFixed(1)}% margin
              </div>
              <div className="text-sm text-slate-600">
                {marginPct >= 10
                  ? "On or under budget"
                  : marginPct >= 0
                    ? "Within 10% of budget — monitor closely"
                    : "Over budget — action needed"}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Financial summary */}
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-xs font-medium uppercase text-slate-400">Quoted</div>
          <div className="mt-1 text-2xl font-bold text-slate-900">{formatCurrency(job.quoted_total)}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-xs font-medium uppercase text-slate-400">Actual</div>
          <div className="mt-1 text-2xl font-bold text-slate-900">{formatCurrency(job.actual_total)}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-xs font-medium uppercase text-slate-400">Profit</div>
          <div className={`mt-1 text-2xl font-bold ${marginColor}`}>
            {formatCurrency(profit)}
            {job.actual_total > 0 && (
              <span className="ml-1 text-sm">({marginPct >= 0 ? "+" : ""}{marginPct.toFixed(1)}%)</span>
            )}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={`/jobs/${job.id}/timeline`}
          className="min-h-[44px] flex items-center rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Timeline
        </Link>
        <Link
          href={`/jobs/${job.id}/photos`}
          className="min-h-[44px] flex items-center rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Photos
        </Link>
      </div>

      {/* Cost breakdown by category */}
      <div className="mt-4 rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">Cost Breakdown</h3>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {canEdit && (
              <Link
                href={`/jobs/${job.id}/actual-costs`}
                className="min-h-[44px] flex items-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Log actual costs
              </Link>
            )}
            {isOwnerOrManager && (
              <Link
                href={`/jobs/${job.id}/quoted-costs`}
                className="min-h-[44px] flex items-center rounded-md bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
              >
                Edit quoted costs
              </Link>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
        <table className="w-full min-w-[400px] text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-slate-600">Category</th>
              <th className="px-4 py-2 text-right font-medium text-slate-600">Quoted</th>
              <th className="px-4 py-2 text-right font-medium text-slate-600">Actual</th>
              <th className="px-4 py-2 text-right font-medium text-slate-600">Diff</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {COST_CATEGORIES.map(({ value, label }) => {
              const q = quotedByCategory.get(value) ?? 0;
              const a = actualByCategory.get(value) ?? 0;
              const diff = q - a;
              const diffColor = a === 0 ? "text-slate-400" : diff >= 0 ? "text-green-600" : "text-red-600";
              if (q === 0 && a === 0) return null;
              return (
                <tr key={value}>
                  <td className="px-4 py-2 text-slate-700">{label}</td>
                  <td className="px-4 py-2 text-right text-slate-900">{formatCurrency(q)}</td>
                  <td className="px-4 py-2 text-right text-slate-900">{formatCurrency(a)}</td>
                  <td className={`px-4 py-2 text-right font-medium ${diffColor}`}>
                    {diff >= 0 ? "+" : ""}{formatCurrency(diff)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="border-t border-slate-200 bg-slate-50">
            <tr className="font-semibold">
              <td className="px-4 py-2 text-slate-700">Total</td>
              <td className="px-4 py-2 text-right text-slate-900">{formatCurrency(job.quoted_total)}</td>
              <td className="px-4 py-2 text-right text-slate-900">{formatCurrency(job.actual_total)}</td>
              <td className={`px-4 py-2 text-right ${marginColor}`}>
                {profit >= 0 ? "+" : ""}{formatCurrency(profit)}
              </td>
            </tr>
          </tfoot>
        </table>
        </div>
      </div>

      {/* Quoted cost line items */}
      {quotedCosts && quotedCosts.length > 0 && (
        <div className="mt-4 rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-700">Quoted Cost Lines</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">Category</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">Description</th>
                  <th className="px-4 py-2 text-right font-medium text-slate-600">Qty</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">Unit</th>
                  <th className="px-4 py-2 text-right font-medium text-slate-600">Unit cost</th>
                  <th className="px-4 py-2 text-right font-medium text-slate-600">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {quotedCosts.map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-2 text-slate-600">{COST_CATEGORIES.find((cat) => cat.value === c.category)?.label}</td>
                    <td className="px-4 py-2 text-slate-900">{c.description}</td>
                    <td className="px-4 py-2 text-right text-slate-900">{c.quantity}</td>
                    <td className="px-4 py-2 text-slate-600">{c.unit}</td>
                    <td className="px-4 py-2 text-right text-slate-900">{formatCurrency(c.unit_cost)}</td>
                    <td className="px-4 py-2 text-right font-medium text-slate-900">{formatCurrency(c.line_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete (owner only) */}
      {profile?.role === "owner" && (
        <div className="mt-8 rounded-lg border border-red-200 bg-red-50 p-4">
          <h3 className="text-sm font-semibold text-red-700">Danger zone</h3>
          <p className="mt-1 text-sm text-red-600">Deleting a job removes all associated costs, photos, and updates.</p>
          <form action={deleteJob} className="mt-3">
            <input type="hidden" name="jobId" value={job.id} />
            <button
              type="submit"
              className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
            >
              Delete job
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
