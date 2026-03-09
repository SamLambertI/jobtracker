export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { deleteTimeEntry } from "./actions";

function getWeekDates(offset: number) {
  const now = new Date();
  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset + offset * 7);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(d);
  }

  return { monday, sunday, days };
}

function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatMapLink(lat: number, lng: number) {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

export default async function TimesheetPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; user?: string }>;
}) {
  const params = await searchParams;
  const weekOffset = parseInt(params.week ?? "0", 10);
  const filterUserId = params.user ?? null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("company_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.company_id) redirect("/login");

  const isOwnerOrManager = profile.role === "owner" || profile.role === "manager";
  const { monday, sunday, days } = getWeekDates(weekOffset);

  // Get time entries for the week
  let query = supabase
    .from("time_entries")
    .select(
      `
      id,
      user_id,
      job_id,
      clock_in,
      clock_out,
      clock_in_lat,
      clock_in_lng,
      clock_out_lat,
      clock_out_lng,
      users!inner(name),
      jobs(client_name)
    `
    )
    .eq("company_id", profile.company_id)
    .gte("clock_in", monday.toISOString())
    .lte("clock_in", sunday.toISOString())
    .order("clock_in", { ascending: true });

  if (filterUserId) {
    query = query.eq("user_id", filterUserId);
  }

  const { data: entries } = await query;

  // Get team members for filter dropdown (if owner/manager)
  let teamMembers: { id: string; name: string }[] = [];
  if (isOwnerOrManager) {
    const { data: members } = await supabase
      .from("users")
      .select("id, name")
      .eq("company_id", profile.company_id)
      .order("name");
    teamMembers = members ?? [];
  }

  // Group entries by user, then by day
  const byUser = new Map<
    string,
    {
      name: string;
      totalMinutes: number;
      days: Map<string, typeof entries>;
    }
  >();

  for (const entry of entries ?? []) {
    const userData = entry.users as unknown as { name: string };
    const userId = entry.user_id;

    if (!byUser.has(userId)) {
      byUser.set(userId, {
        name: userData.name,
        totalMinutes: 0,
        days: new Map(),
      });
    }

    const userGroup = byUser.get(userId)!;
    const dayKey = new Date(entry.clock_in).toLocaleDateString("en-GB");

    if (!userGroup.days.has(dayKey)) {
      userGroup.days.set(dayKey, []);
    }
    userGroup.days.get(dayKey)!.push(entry);

    if (entry.clock_out) {
      const mins =
        (new Date(entry.clock_out).getTime() - new Date(entry.clock_in).getTime()) / 60000;
      userGroup.totalMinutes += mins;
    }
  }

  const weekLabel = `${monday.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} — ${sunday.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-slate-900">Timesheet</h2>
        <div className="flex items-center gap-2">
          <Link
            href={`/timesheet?week=${weekOffset - 1}${filterUserId ? `&user=${filterUserId}` : ""}`}
            className="min-h-[44px] flex items-center rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            &larr; Prev
          </Link>
          {weekOffset !== 0 && (
            <Link
              href={`/timesheet${filterUserId ? `?user=${filterUserId}` : ""}`}
              className="min-h-[44px] flex items-center rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              This week
            </Link>
          )}
          <Link
            href={`/timesheet?week=${weekOffset + 1}${filterUserId ? `&user=${filterUserId}` : ""}`}
            className="min-h-[44px] flex items-center rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Next &rarr;
          </Link>
        </div>
      </div>

      <p className="text-sm font-medium text-slate-500">{weekLabel}</p>

      {/* User filter (owner/manager only) */}
      {isOwnerOrManager && teamMembers.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/timesheet?week=${weekOffset}`}
            className={`min-h-[36px] flex items-center rounded-full px-3 py-1 text-sm font-medium ${
              !filterUserId
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Everyone
          </Link>
          {teamMembers.map((m) => (
            <Link
              key={m.id}
              href={`/timesheet?week=${weekOffset}&user=${m.id}`}
              className={`min-h-[36px] flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                filterUserId === m.id
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {m.name}
            </Link>
          ))}
        </div>
      )}

      {byUser.size === 0 ? (
        <p className="text-sm text-slate-500">No time entries this week.</p>
      ) : (
        Array.from(byUser.entries()).map(([userId, userData]) => (
          <div key={userId} className="rounded-lg border border-slate-200 bg-white">
            {/* User header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h3 className="text-sm font-semibold text-slate-900">{userData.name}</h3>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                {formatDuration(userData.totalMinutes)} total
              </span>
            </div>

            {/* Day-by-day breakdown */}
            {days.map((day) => {
              const dayKey = day.toLocaleDateString("en-GB");
              const dayEntries = userData.days.get(dayKey);
              if (!dayEntries?.length) return null;

              const dayTotal = dayEntries.reduce((sum, e) => {
                if (!e.clock_out) return sum;
                return (
                  sum +
                  (new Date(e.clock_out).getTime() - new Date(e.clock_in).getTime()) / 60000
                );
              }, 0);

              return (
                <div key={dayKey} className="border-b border-slate-100 last:border-0">
                  <div className="flex items-center justify-between bg-slate-50 px-4 py-2">
                    <span className="text-xs font-medium text-slate-500">
                      {day.toLocaleDateString("en-GB", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                    <span className="text-xs font-medium text-slate-600">
                      {formatDuration(dayTotal)}
                    </span>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {dayEntries.map((entry) => {
                      const jobData = entry.jobs as unknown as { client_name: string } | null;
                      const clockIn = new Date(entry.clock_in);
                      const clockOut = entry.clock_out ? new Date(entry.clock_out) : null;
                      const duration = clockOut
                        ? (clockOut.getTime() - clockIn.getTime()) / 60000
                        : null;

                      return (
                        <div
                          key={entry.id}
                          className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2"
                        >
                          {entry.job_id && jobData ? (
                            <Link
                              href={`/jobs/${entry.job_id}`}
                              className="text-sm font-medium text-slate-900 hover:text-blue-600"
                            >
                              {jobData.client_name}
                            </Link>
                          ) : (
                            <span className="text-sm font-medium text-slate-400 italic">
                              No job allocated
                            </span>
                          )}
                          <span className="text-xs text-slate-500">
                            {clockIn.toLocaleTimeString("en-GB", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                            {" — "}
                            {clockOut
                              ? clockOut.toLocaleTimeString("en-GB", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "active"}
                          </span>
                          {duration !== null && (
                            <span className="text-xs font-medium text-slate-600">
                              {formatDuration(duration)}
                            </span>
                          )}
                          {!clockOut && (
                            <span className="relative flex h-2 w-2">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
                            </span>
                          )}
                          {/* Location pins */}
                          <span className="flex items-center gap-1">
                            {entry.clock_in_lat && entry.clock_in_lng && (
                              <a
                                href={formatMapLink(entry.clock_in_lat, entry.clock_in_lng)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-500 hover:text-blue-700"
                                title="Clock-in location"
                              >
                                In pin
                              </a>
                            )}
                            {entry.clock_out_lat && entry.clock_out_lng && (
                              <a
                                href={formatMapLink(entry.clock_out_lat, entry.clock_out_lng)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ml-1 text-xs text-blue-500 hover:text-blue-700"
                                title="Clock-out location"
                              >
                                Out pin
                              </a>
                            )}
                          </span>
                          {/* Delete */}
                          {(userId === user.id || isOwnerOrManager) && (
                            <form action={deleteTimeEntry} className="ml-auto">
                              <input type="hidden" name="entryId" value={entry.id} />
                              <input
                                type="hidden"
                                name="returnTo"
                                value={`/timesheet?week=${weekOffset}${filterUserId ? `&user=${filterUserId}` : ""}`}
                              />
                              <button
                                type="submit"
                                className="text-xs text-slate-400 hover:text-red-600"
                              >
                                Delete
                              </button>
                            </form>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ))
      )}
    </div>
  );
}
