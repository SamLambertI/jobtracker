"use client";

import { useRef, useState } from "react";
import { clockIn, clockOut } from "@/app/(dashboard)/timesheet/actions";

interface ClockButtonProps {
  jobId: string;
  activeEntry?: { id: string; clock_in: string } | null;
}

export function ClockButton({ jobId, activeEntry }: ClockButtonProps) {
  const [locating, setLocating] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const latRef = useRef<HTMLInputElement>(null);
  const lngRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
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

  if (activeEntry) {
    const clockInTime = new Date(activeEntry.clock_in).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });

    return (
      <form ref={formRef} action={clockOut}>
        <input type="hidden" name="entryId" value={activeEntry.id} />
        <input type="hidden" name="returnTo" value={`/jobs/${jobId}`} />
        <input ref={latRef} type="hidden" name="lat" />
        <input ref={lngRef} type="hidden" name="lng" />
        <button
          type="button"
          onClick={handleClick}
          disabled={locating}
          className="min-h-[44px] flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-300 opacity-75"></span>
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white"></span>
          </span>
          {locating ? "Getting location..." : `Clock out (in since ${clockInTime})`}
        </button>
      </form>
    );
  }

  return (
    <form ref={formRef} action={clockIn}>
      <input type="hidden" name="jobId" value={jobId} />
      <input type="hidden" name="returnTo" value={`/jobs/${jobId}`} />
      <input ref={latRef} type="hidden" name="lat" />
      <input ref={lngRef} type="hidden" name="lng" />
      <button
        type="button"
        onClick={handleClick}
        disabled={locating}
        className="min-h-[44px] flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
      >
        {locating ? "Getting location..." : "Clock in"}
      </button>
    </form>
  );
}
