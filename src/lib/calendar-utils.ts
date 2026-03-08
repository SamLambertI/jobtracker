export interface CalendarJob {
  id: string;
  client_name: string;
  description: string;
  status: string;
  team_id: string | null;
  start_date: string | null;
  end_date: string | null;
  quoted_total: number;
  actual_total: number;
}

export interface Team {
  id: string;
  name: string;
}

export function getWeekDates(date: Date): Date[] {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

export function getMonthDates(date: Date): Date[] {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Start from Monday of the first week
  const startDay = firstDay.getDay();
  const diff = startDay === 0 ? -6 : 1 - startDay;
  const start = new Date(firstDay);
  start.setDate(start.getDate() + diff);

  const dates: Date[] = [];
  const current = new Date(start);
  while (current <= lastDay || dates.length % 7 !== 0) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
    if (dates.length > 42) break; // safety
  }
  return dates;
}

export function formatDateKey(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function daysBetween(a: Date, b: Date): number {
  const msPerDay = 86400000;
  return Math.round((b.getTime() - a.getTime()) / msPerDay);
}

export function jobSpansDays(job: CalendarJob): number {
  if (!job.start_date || !job.end_date) return 1;
  return daysBetween(parseDateKey(job.start_date), parseDateKey(job.end_date)) + 1;
}

export const STATUS_COLORS: Record<string, string> = {
  quoted: "bg-slate-300 border-slate-400 text-slate-800",
  booked: "bg-blue-300 border-blue-400 text-blue-900",
  in_progress: "bg-amber-300 border-amber-400 text-amber-900",
  complete: "bg-green-300 border-green-400 text-green-900",
};

export function getJobsForTeamAndDate(
  jobs: CalendarJob[],
  teamId: string,
  dateKey: string
): CalendarJob[] {
  return jobs.filter(
    (j) =>
      j.team_id === teamId &&
      j.start_date &&
      j.end_date &&
      j.start_date <= dateKey &&
      j.end_date >= dateKey
  );
}

export interface CascadeMove {
  jobId: string;
  clientName: string;
  oldStart: string;
  oldEnd: string;
  newStart: string;
  newEnd: string;
  shiftDays: number;
}

export function calculateCascade(
  changedJob: CalendarJob,
  newEndDate: string,
  allJobs: CalendarJob[]
): CascadeMove[] {
  if (!changedJob.start_date || !changedJob.end_date || !changedJob.team_id) return [];

  const changedJobEnd = changedJob.end_date;
  const oldEnd = parseDateKey(changedJobEnd);
  const newEnd = parseDateKey(newEndDate);
  const overrunDays = daysBetween(oldEnd, newEnd);

  if (overrunDays <= 0) return [];

  // Get subsequent jobs on same team, sorted by start date
  const subsequentJobs = allJobs
    .filter(
      (j) =>
        j.id !== changedJob.id &&
        j.team_id === changedJob.team_id &&
        j.start_date &&
        j.end_date &&
        j.start_date > changedJobEnd &&
        j.status !== "complete" &&
        j.status !== "invoiced"
    )
    .sort((a, b) => a.start_date!.localeCompare(b.start_date!));

  if (subsequentJobs.length === 0) return [];

  const moves: CascadeMove[] = [];
  let cumulativeShift = overrunDays;

  for (const job of subsequentJobs) {
    const jobStart = parseDateKey(job.start_date!);
    const jobEnd = parseDateKey(job.end_date!);

    // Check if this job would overlap with the new end date or previously shifted job
    const effectiveNewEnd = moves.length > 0
      ? parseDateKey(moves[moves.length - 1].newEnd)
      : newEnd;

    if (jobStart <= effectiveNewEnd) {
      const shift = daysBetween(jobStart, effectiveNewEnd) + 1;
      const actualShift = Math.max(shift, cumulativeShift > 0 ? 1 : 0);

      if (actualShift > 0) {
        const newStart = addDays(jobStart, actualShift);
        const newJobEnd = addDays(jobEnd, actualShift);
        moves.push({
          jobId: job.id,
          clientName: job.client_name,
          oldStart: job.start_date!,
          oldEnd: job.end_date!,
          newStart: formatDateKey(newStart),
          newEnd: formatDateKey(newJobEnd),
          shiftDays: actualShift,
        });
      }
    }
  }

  return moves;
}

export function detectConflicts(
  jobs: CalendarJob[],
  teamId: string,
  excludeJobId?: string
): { jobA: CalendarJob; jobB: CalendarJob }[] {
  const teamJobs = jobs
    .filter(
      (j) =>
        j.team_id === teamId &&
        j.start_date &&
        j.end_date &&
        j.id !== excludeJobId
    )
    .sort((a, b) => a.start_date!.localeCompare(b.start_date!));

  const conflicts: { jobA: CalendarJob; jobB: CalendarJob }[] = [];

  for (let i = 0; i < teamJobs.length; i++) {
    for (let k = i + 1; k < teamJobs.length; k++) {
      if (teamJobs[i].end_date! >= teamJobs[k].start_date!) {
        conflicts.push({ jobA: teamJobs[i], jobB: teamJobs[k] });
      }
    }
  }

  return conflicts;
}
