"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  CalendarJob,
  Team,
  getWeekDates,
  formatDateKey,
  addDays,
  daysBetween,
  parseDateKey,
  calculateCascade,
  CascadeMove,
  STATUS_COLORS,
} from "@/lib/calendar-utils";
import { formatCurrency } from "@/lib/constants";
import { rescheduleJob, cascadeReschedule, assignJobToTeam } from "./actions";
import Link from "next/link";

type ViewMode = "week" | "month" | "day";

interface Props {
  teams: Team[];
  initialJobs: CalendarJob[];
  companyId: string;
  userTeamId: string | null;
  canViewAll: boolean;
  canEdit: boolean;
}

export function CalendarView({
  teams,
  initialJobs,
  companyId,
  userTeamId,
  canViewAll,
  canEdit,
}: Props) {
  const [jobs, setJobs] = useState<CalendarJob[]>(initialJobs);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== "undefined" && window.innerWidth < 640) return "day";
    return "week";
  });
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [dragJob, setDragJob] = useState<CalendarJob | null>(null);
  const [cascadeModal, setCascadeModal] = useState<{
    job: CalendarJob;
    newStart: string;
    newEnd: string;
    moves: CascadeMove[];
    targetTeamId?: string;
  } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Supabase Realtime subscription
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("jobs-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "jobs",
        },
        (payload) => {
          if (payload.eventType === "UPDATE") {
            const updated = payload.new as CalendarJob;
            setJobs((prev) =>
              prev.map((j) => (j.id === updated.id ? { ...j, ...updated } : j))
            );
          } else if (payload.eventType === "INSERT") {
            const inserted = payload.new as CalendarJob;
            setJobs((prev) => [...prev, inserted]);
          } else if (payload.eventType === "DELETE") {
            const deleted = payload.old as { id: string };
            setJobs((prev) => prev.filter((j) => j.id !== deleted.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId]);

  // Toast auto-dismiss
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  // Touch swipe for day view navigation
  const touchStartX = useRef<number | null>(null);
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);
  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartX.current === null) return;
      const diff = e.changedTouches[0].clientX - touchStartX.current;
      touchStartX.current = null;
      if (Math.abs(diff) < 50) return; // minimum swipe distance
      if (viewMode === "day") {
        navigateDay(diff > 0 ? -1 : 1);
      }
    },
    [viewMode]
  );

  const weekDates = getWeekDates(currentDate);

  const visibleTeams = canViewAll
    ? teams
    : teams.filter((t) => t.id === userTeamId);

  const navigateWeek = (delta: number) => {
    setCurrentDate((d) => addDays(d, delta * 7));
  };

  const navigateMonth = (delta: number) => {
    setCurrentDate((d) => {
      const nd = new Date(d);
      nd.setMonth(nd.getMonth() + delta);
      return nd;
    });
  };

  const navigateDay = (delta: number) => {
    setCurrentDate((d) => addDays(d, delta));
  };

  const goToToday = () => setCurrentDate(new Date());

  // Unscheduled jobs
  const unscheduledJobs = jobs.filter(
    (j) => !j.start_date && j.status !== "invoiced" && j.status !== "complete"
  );

  // Team capacity for current week
  const getTeamCapacity = (teamId: string) => {
    const teamJobs = jobs.filter(
      (j) =>
        j.team_id === teamId &&
        j.start_date &&
        j.end_date &&
        j.start_date <= formatDateKey(weekDates[6]) &&
        j.end_date >= formatDateKey(weekDates[0])
    );

    let bookedDays = 0;
    for (const job of teamJobs) {
      const jobStart = parseDateKey(job.start_date!);
      const jobEnd = parseDateKey(job.end_date!);
      const visStart = jobStart < weekDates[0] ? weekDates[0] : jobStart;
      const visEnd = jobEnd > weekDates[6] ? weekDates[6] : jobEnd;
      bookedDays += daysBetween(visStart, visEnd) + 1;
    }
    // 5 working days per week
    return { booked: Math.min(bookedDays, 5), total: 5 };
  };

  // Drag handlers
  const handleDragStart = (job: CalendarJob) => {
    if (!canEdit) return;
    setDragJob(job);
  };

  const handleDrop = useCallback(
    async (teamId: string, dateKey: string) => {
      if (!dragJob || !canEdit) return;

      const duration = dragJob.start_date && dragJob.end_date
        ? daysBetween(parseDateKey(dragJob.start_date), parseDateKey(dragJob.end_date))
        : 0;

      const newStart = dateKey;
      const newEnd = formatDateKey(addDays(parseDateKey(dateKey), duration));

      // If unscheduled job being dropped
      if (!dragJob.start_date) {
        const result = await assignJobToTeam(dragJob.id, teamId, newStart, newEnd);
        if (result.error) {
          setToast(`Error: ${result.error}`);
        } else {
          setJobs((prev) =>
            prev.map((j) =>
              j.id === dragJob.id
                ? { ...j, team_id: teamId, start_date: newStart, end_date: newEnd }
                : j
            )
          );
          setToast(`${dragJob.client_name} scheduled on ${teams.find(t => t.id === teamId)?.name}`);
        }
        setDragJob(null);
        return;
      }

      // Check for cascade
      const isEndExtended =
        dragJob.team_id === teamId &&
        newEnd > dragJob.end_date!;

      if (isEndExtended) {
        const moves = calculateCascade(dragJob, newEnd, jobs);
        if (moves.length > 0) {
          setCascadeModal({
            job: dragJob,
            newStart,
            newEnd,
            moves,
          });
          setDragJob(null);
          return;
        }
      }

      // Simple reschedule
      const result = await rescheduleJob(
        dragJob.id,
        newStart,
        newEnd,
        teamId !== dragJob.team_id ? teamId : null
      );

      if (result.error) {
        setToast(`Error: ${result.error}`);
      } else {
        setJobs((prev) =>
          prev.map((j) =>
            j.id === dragJob.id
              ? { ...j, start_date: newStart, end_date: newEnd, team_id: teamId }
              : j
          )
        );
        if (teamId !== dragJob.team_id) {
          setToast(`${dragJob.client_name} moved to ${teams.find(t => t.id === teamId)?.name}`);
        }
      }

      setDragJob(null);
    },
    [dragJob, canEdit, jobs, teams]
  );

  const applyCascade = async () => {
    if (!cascadeModal) return;

    // First update the main job
    await rescheduleJob(
      cascadeModal.job.id,
      cascadeModal.newStart,
      cascadeModal.newEnd,
      cascadeModal.targetTeamId ?? null
    );

    // Then cascade all downstream jobs
    const result = await cascadeReschedule(
      cascadeModal.moves.map((m) => ({
        jobId: m.jobId,
        startDate: m.newStart,
        endDate: m.newEnd,
      }))
    );

    if (result.error) {
      setToast(`Error: ${result.error}`);
    } else {
      // Update local state
      setJobs((prev) => {
        let updated = prev.map((j) =>
          j.id === cascadeModal.job.id
            ? {
                ...j,
                start_date: cascadeModal.newStart,
                end_date: cascadeModal.newEnd,
                ...(cascadeModal.targetTeamId
                  ? { team_id: cascadeModal.targetTeamId }
                  : {}),
              }
            : j
        );
        for (const move of cascadeModal.moves) {
          updated = updated.map((j) =>
            j.id === move.jobId
              ? { ...j, start_date: move.newStart, end_date: move.newEnd }
              : j
          );
        }
        return updated;
      });

      const teamName = teams.find(
        (t) => t.id === (cascadeModal.targetTeamId ?? cascadeModal.job.team_id)
      )?.name;
      setToast(
        `${cascadeModal.moves.length} job${cascadeModal.moves.length > 1 ? "s" : ""} shifted on ${teamName}`
      );
    }

    setCascadeModal(null);
  };

  // Detect conflicts for highlighting
  const conflictJobIds = new Set<string>();
  for (const team of visibleTeams) {
    const teamJobs = jobs
      .filter((j) => j.team_id === team.id && j.start_date && j.end_date)
      .sort((a, b) => a.start_date!.localeCompare(b.start_date!));
    for (let i = 0; i < teamJobs.length; i++) {
      for (let k = i + 1; k < teamJobs.length; k++) {
        if (teamJobs[i].end_date! >= teamJobs[k].start_date!) {
          conflictJobIds.add(teamJobs[i].id);
          conflictJobIds.add(teamJobs[k].id);
        }
      }
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-slate-900">Schedule</h2>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-slate-200 bg-white">
            {(["day", "week", "month"] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`min-h-[44px] px-3 py-1.5 text-sm font-medium capitalize ${
                  viewMode === mode
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-50"
                } ${mode === "day" ? "rounded-l-md" : mode === "month" ? "rounded-r-md" : ""} ${
                  mode === "week" ? "hidden sm:block" : ""
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
          <button
            onClick={goToToday}
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 min-h-[44px]"
          >
            Today
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div className="mt-4 flex items-center justify-between">
        <button
          onClick={() =>
            viewMode === "week"
              ? navigateWeek(-1)
              : viewMode === "month"
                ? navigateMonth(-1)
                : navigateDay(-1)
          }
          className="rounded-md p-2 text-slate-500 hover:bg-slate-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <h3 className="text-sm font-semibold text-slate-700">
          {viewMode === "week" && (
            <>
              {weekDates[0].toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
              {" — "}
              {weekDates[6].toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            </>
          )}
          {viewMode === "month" &&
            currentDate.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
          {viewMode === "day" &&
            currentDate.toLocaleDateString("en-GB", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
        </h3>
        <button
          onClick={() =>
            viewMode === "week"
              ? navigateWeek(1)
              : viewMode === "month"
                ? navigateMonth(1)
                : navigateDay(1)
          }
          className="rounded-md p-2 text-slate-500 hover:bg-slate-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>

      {/* Views */}
      <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      {viewMode === "week" && (
        <WeekView
          teams={visibleTeams}
          jobs={jobs}
          weekDates={weekDates}
          dragJob={dragJob}
          conflictJobIds={conflictJobIds}
          canEdit={canEdit}
          getTeamCapacity={getTeamCapacity}
          onDragStart={handleDragStart}
          onDrop={handleDrop}
        />
      )}

      {viewMode === "month" && (
        <MonthView
          teams={visibleTeams}
          jobs={jobs}
          currentDate={currentDate}
          conflictJobIds={conflictJobIds}
        />
      )}

      {viewMode === "day" && (
        <DayView
          teams={visibleTeams}
          jobs={jobs}
          date={currentDate}
          conflictJobIds={conflictJobIds}
        />
      )}
      </div>

      {/* Swipe hint on mobile day view */}
      {viewMode === "day" && (
        <p className="mt-2 text-center text-xs text-slate-400 sm:hidden">
          Swipe left/right to change day
        </p>
      )}

      {/* Unscheduled jobs panel */}
      {unscheduledJobs.length > 0 && canEdit && (
        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">
            Unscheduled Jobs ({unscheduledJobs.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {unscheduledJobs.map((job) => {
              const statusClass = STATUS_COLORS[job.status] ?? STATUS_COLORS.quoted;
              return (
                <div
                  key={job.id}
                  draggable
                  onDragStart={() => handleDragStart(job)}
                  className={`cursor-grab rounded-md border px-3 py-2 text-sm ${statusClass} active:cursor-grabbing`}
                >
                  <span className="font-medium">{job.client_name}</span>
                  <span className="ml-1 text-xs opacity-75">{job.status.replace("_", " ")}</span>
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Drag a job onto the calendar to schedule it.
          </p>
        </div>
      )}

      {/* Cascade modal */}
      {cascadeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Cascade schedule change</h3>
            <p className="mt-2 text-sm text-slate-600">
              Extending <strong>{cascadeModal.job.client_name}</strong> to{" "}
              {cascadeModal.newEnd} will affect the following jobs:
            </p>
            <div className="mt-4 space-y-2">
              {cascadeModal.moves.map((move) => (
                <div
                  key={move.jobId}
                  className="flex items-center justify-between rounded-md bg-amber-50 px-3 py-2 text-sm"
                >
                  <span className="font-medium text-slate-900">{move.clientName}</span>
                  <span className="text-slate-500">
                    {move.oldStart} → {move.newStart}{" "}
                    <span className="text-amber-600">(+{move.shiftDays}d)</span>
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setCascadeModal(null)}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={applyCascade}
                className="rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600"
              >
                Apply cascade
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm text-white shadow-lg sm:bottom-6">
          {toast}
        </div>
      )}
    </div>
  );
}

// ─── Week View ───────────────────────────────────────────────────────────────

function WeekView({
  teams,
  jobs,
  weekDates,
  dragJob,
  conflictJobIds,
  canEdit,
  getTeamCapacity,
  onDragStart,
  onDrop,
}: {
  teams: Team[];
  jobs: CalendarJob[];
  weekDates: Date[];
  dragJob: CalendarJob | null;
  conflictJobIds: Set<string>;
  canEdit: boolean;
  getTeamCapacity: (teamId: string) => { booked: number; total: number };
  onDragStart: (job: CalendarJob) => void;
  onDrop: (teamId: string, dateKey: string) => void;
}) {
  const today = formatDateKey(new Date());

  return (
    <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full min-w-[700px] border-collapse">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="w-36 border-r border-slate-200 px-3 py-2 text-left text-xs font-semibold text-slate-600">
              Team
            </th>
            {weekDates.map((d) => {
              const key = formatDateKey(d);
              const isToday = key === today;
              const isWeekend = d.getDay() === 0 || d.getDay() === 6;
              return (
                <th
                  key={key}
                  className={`border-r border-slate-200 px-2 py-2 text-center text-xs font-medium last:border-r-0 ${
                    isToday
                      ? "bg-blue-50 text-blue-700"
                      : isWeekend
                        ? "bg-slate-100 text-slate-400"
                        : "text-slate-600"
                  }`}
                >
                  <div>{d.toLocaleDateString("en-GB", { weekday: "short" })}</div>
                  <div className={`text-lg ${isToday ? "font-bold" : ""}`}>{d.getDate()}</div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {teams.map((team) => {
            const cap = getTeamCapacity(team.id);
            const capPct = cap.total > 0 ? (cap.booked / cap.total) * 100 : 0;
            return (
              <tr key={team.id} className="border-b border-slate-100 last:border-b-0">
                <td className="border-r border-slate-200 px-3 py-2 align-top">
                  <div className="text-sm font-medium text-slate-900">{team.name}</div>
                  <div className="mt-1 flex items-center gap-1">
                    <div className="h-1.5 w-16 rounded-full bg-slate-100">
                      <div
                        className={`h-1.5 rounded-full ${
                          capPct >= 80 ? "bg-red-400" : capPct >= 50 ? "bg-amber-400" : "bg-green-400"
                        }`}
                        style={{ width: `${Math.min(capPct, 100)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-400">{cap.booked}/{cap.total}d</span>
                  </div>
                </td>
                {weekDates.map((d) => {
                  const key = formatDateKey(d);
                  const isToday = key === today;
                  const isWeekend = d.getDay() === 0 || d.getDay() === 6;

                  // Find jobs that START on this date for this team
                  const startingJobs = jobs.filter(
                    (j) => j.team_id === team.id && j.start_date === key
                  );

                  // Find jobs that span this date but don't start on it (for background)
                  const spanningJobs = jobs.filter(
                    (j) =>
                      j.team_id === team.id &&
                      j.start_date &&
                      j.end_date &&
                      j.start_date < key &&
                      j.end_date >= key
                  );

                  return (
                    <td
                      key={key}
                      className={`relative border-r border-slate-200 p-1 align-top last:border-r-0 ${
                        isToday ? "bg-blue-50/50" : isWeekend ? "bg-slate-50" : ""
                      } ${dragJob ? "cursor-crosshair" : ""}`}
                      style={{ minHeight: "60px", height: "60px" }}
                      onDragOver={(e) => {
                        if (canEdit) e.preventDefault();
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        onDrop(team.id, key);
                      }}
                    >
                      {spanningJobs.map((job) => {
                        const statusClass = STATUS_COLORS[job.status] ?? STATUS_COLORS.quoted;
                        const isConflict = conflictJobIds.has(job.id);
                        return (
                          <div
                            key={job.id}
                            className={`mb-1 h-1.5 rounded-full ${isConflict ? "bg-red-500" : statusClass.split(" ")[0]}`}
                            title={job.client_name}
                          />
                        );
                      })}
                      {startingJobs.map((job) => {
                        const statusClass = STATUS_COLORS[job.status] ?? STATUS_COLORS.quoted;
                        const isConflict = conflictJobIds.has(job.id);
                        const span = job.end_date
                          ? daysBetween(parseDateKey(job.start_date!), parseDateKey(job.end_date)) + 1
                          : 1;
                        return (
                          <Link
                            key={job.id}
                            href={`/jobs/${job.id}`}
                            draggable={canEdit}
                            onDragStart={(e) => {
                              e.stopPropagation();
                              onDragStart(job);
                            }}
                            className={`block rounded border px-1.5 py-1 text-xs leading-tight ${statusClass} ${
                              isConflict ? "ring-2 ring-red-500" : ""
                            } ${canEdit ? "cursor-grab active:cursor-grabbing" : ""} hover:opacity-90 mb-1`}
                            title={`${job.client_name} (${span}d)`}
                          >
                            <div className="truncate font-medium">{job.client_name}</div>
                          </Link>
                        );
                      })}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Month View ──────────────────────────────────────────────────────────────

function MonthView({
  teams,
  jobs,
  currentDate,
  conflictJobIds,
}: {
  teams: Team[];
  jobs: CalendarJob[];
  currentDate: Date;
  conflictJobIds: Set<string>;
}) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Build weeks
  const startDow = firstDay.getDay();
  const startOffset = startDow === 0 ? -6 : 1 - startDow;
  const start = new Date(firstDay);
  start.setDate(start.getDate() + startOffset);

  const weeks: Date[][] = [];
  const curr = new Date(start);
  while (curr <= lastDay || weeks.length === 0 || weeks[weeks.length - 1].length < 7) {
    if (!weeks.length || weeks[weeks.length - 1].length === 7) weeks.push([]);
    weeks[weeks.length - 1].push(new Date(curr));
    curr.setDate(curr.getDate() + 1);
    if (weeks.length > 6) break;
  }

  const today = formatDateKey(new Date());

  return (
    <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full min-w-[500px] border-collapse">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <th key={d} className="border-r border-slate-200 px-2 py-2 text-center text-xs font-medium text-slate-600 last:border-r-0">
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, wi) => (
            <tr key={wi} className="border-b border-slate-100 last:border-b-0">
              {week.map((d) => {
                const key = formatDateKey(d);
                const isToday = key === today;
                const isCurrentMonth = d.getMonth() === month;

                const dayJobs = jobs.filter(
                  (j) => j.start_date && j.end_date && j.start_date <= key && j.end_date >= key
                );

                return (
                  <td
                    key={key}
                    className={`border-r border-slate-200 p-1.5 align-top last:border-r-0 ${
                      isCurrentMonth ? "" : "bg-slate-50"
                    } ${isToday ? "bg-blue-50" : ""}`}
                    style={{ minHeight: "70px", height: "70px" }}
                  >
                    <div
                      className={`mb-1 text-xs ${
                        isToday
                          ? "font-bold text-blue-700"
                          : isCurrentMonth
                            ? "text-slate-700"
                            : "text-slate-300"
                      }`}
                    >
                      {d.getDate()}
                    </div>
                    {dayJobs.slice(0, 3).map((job) => {
                      const statusClass = STATUS_COLORS[job.status] ?? STATUS_COLORS.quoted;
                      const isConflict = conflictJobIds.has(job.id);
                      return (
                        <Link
                          key={job.id}
                          href={`/jobs/${job.id}`}
                          className={`mb-0.5 block truncate rounded px-1 py-0.5 text-[10px] leading-tight ${statusClass} ${
                            isConflict ? "ring-1 ring-red-500" : ""
                          }`}
                        >
                          {job.client_name}
                        </Link>
                      );
                    })}
                    {dayJobs.length > 3 && (
                      <div className="text-[10px] text-slate-400">+{dayJobs.length - 3} more</div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Day View ────────────────────────────────────────────────────────────────

function DayView({
  teams,
  jobs,
  date,
  conflictJobIds,
}: {
  teams: Team[];
  jobs: CalendarJob[];
  date: Date;
  conflictJobIds: Set<string>;
}) {
  const dateKey = formatDateKey(date);

  return (
    <div className="mt-4 space-y-4">
      {teams.map((team) => {
        const teamJobs = jobs.filter(
          (j) =>
            j.team_id === team.id &&
            j.start_date &&
            j.end_date &&
            j.start_date <= dateKey &&
            j.end_date >= dateKey
        );

        return (
          <div key={team.id} className="rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-2">
              <span className="text-sm font-semibold text-slate-700">{team.name}</span>
              <span className="ml-2 text-xs text-slate-400">
                {teamJobs.length} job{teamJobs.length !== 1 ? "s" : ""}
              </span>
            </div>
            {teamJobs.length === 0 ? (
              <div className="px-4 py-3 text-sm text-slate-400">No jobs scheduled</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {teamJobs.map((job) => {
                  const statusClass = STATUS_COLORS[job.status] ?? STATUS_COLORS.quoted;
                  const isConflict = conflictJobIds.has(job.id);
                  const margin =
                    job.quoted_total > 0
                      ? ((job.quoted_total - job.actual_total) / job.quoted_total) * 100
                      : 0;
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
                      className={`flex items-center gap-3 px-4 py-3 hover:bg-slate-50 ${
                        isConflict ? "bg-red-50" : ""
                      }`}
                    >
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusClass}`}
                      >
                        {job.status.replace("_", " ")}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-slate-900">{job.client_name}</div>
                        <div className="truncate text-xs text-slate-500">{job.description}</div>
                        <div className="mt-0.5 text-xs text-slate-400">
                          {job.start_date} — {job.end_date}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-sm font-medium text-slate-900">
                          {formatCurrency(job.quoted_total)}
                        </div>
                        {job.actual_total > 0 && (
                          <div className={`text-xs font-bold ${marginColor}`}>
                            {margin >= 0 ? "+" : ""}
                            {margin.toFixed(1)}%
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
