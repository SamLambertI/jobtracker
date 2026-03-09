"use client";

import { useRef, useState } from "react";
import { clockIn, clockOut, assignJob } from "@/app/(dashboard)/timesheet/actions";

interface ClockControlsProps {
  activeEntry?: {
    id: string;
    clock_in: string;
    job_id: string | null;
  } | null;
  jobs: { id: string; client_name: string }[];
}

export function ClockControls({ activeEntry, jobs }: ClockControlsProps) {
  const [locating, setLocating] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const latRef = useRef<HTMLInputElement>(null);
  const lngRef = useRef<HTMLInputElement>(null);

  const handleClockAction = () => {
    setLocating(true);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (latRef.current) latRef.current.value = String(pos.coords.latitude);
          if (lngRef.current) lngRef.current.value = String(pos.coords.longitude);
          formRef.current?.requestSubmit();
        },
        () => {
          formRef.current?.requestSubmit();
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      formRef.current?.requestSubmit();
    }
  };

  // Currently clocked in
  if (activeEntry) {
    const clockInTime = new Date(activeEntry.clock_in);
    const now = new Date();
    const diffMs = now.getTime() - clockInTime.getTime();
    const hours = Math.floor(diffMs / 3600000);
    const mins = Math.floor((diffMs % 3600000) / 60000);

    return (
      <div className="space-y-4">
        {/* Active status */}
        <div className="rounded-lg border-2 border-green-300 bg-green-50 p-6 text-center">
          <div className="flex items-center justify-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500"></span>
            </span>
            <span className="text-sm font-semibold text-green-700">Clocked in</span>
          </div>
          <div className="mt-2 text-3xl font-bold text-green-900">
            {hours}h {mins}m
          </div>
          <div className="mt-1 text-sm text-green-600">
            Since {clockInTime.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>

        {/* Assign to job */}
        <form action={assignJob} className="rounded-lg border border-slate-200 bg-white p-4">
          <input type="hidden" name="entryId" value={activeEntry.id} />
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Allocate to a job <span className="text-slate-400">(optional)</span>
          </label>
          <div className="flex gap-2">
            <select
              name="jobId"
              defaultValue={activeEntry.job_id ?? ""}
              className="min-h-[44px] flex-1 rounded-md border border-slate-300 px-3 py-2 text-base sm:text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            >
              <option value="">No job — yard work / general</option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.client_name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="min-h-[44px] rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Save
            </button>
          </div>
        </form>

        {/* Clock out */}
        <form ref={formRef} action={clockOut}>
          <input type="hidden" name="entryId" value={activeEntry.id} />
          <input ref={latRef} type="hidden" name="lat" />
          <input ref={lngRef} type="hidden" name="lng" />
          <button
            type="button"
            onClick={handleClockAction}
            disabled={locating}
            className="min-h-[56px] w-full rounded-lg bg-red-600 px-4 py-3 text-lg font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {locating ? "Getting location..." : "Clock out"}
          </button>
        </form>
      </div>
    );
  }

  // Not clocked in — show clock in with optional job selection
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-6 text-center">
        <div className="text-sm text-slate-500">You are not clocked in</div>
        <div className="mt-2 text-3xl font-bold text-slate-300">--:--</div>
      </div>

      <form ref={formRef} action={clockIn} className="space-y-3">
        <input ref={latRef} type="hidden" name="lat" />
        <input ref={lngRef} type="hidden" name="lng" />
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Allocate to a job <span className="text-slate-400">(optional)</span>
          </label>
          <select
            name="jobId"
            defaultValue=""
            className="min-h-[44px] w-full rounded-md border border-slate-300 px-3 py-2 text-base sm:text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          >
            <option value="">No job — yard work / general</option>
            {jobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.client_name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={handleClockAction}
          disabled={locating}
          className="min-h-[56px] w-full rounded-lg bg-green-600 px-4 py-3 text-lg font-semibold text-white hover:bg-green-700 disabled:opacity-50"
        >
          {locating ? "Getting location..." : "Clock in"}
        </button>
      </form>
    </div>
  );
}
