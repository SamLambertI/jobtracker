"use client";

import { useRef } from "react";
import { postUpdate } from "./actions";

export function UpdateForm() {
  const formRef = useRef<HTMLFormElement>(null);

  const inputClass =
    "w-full min-h-[44px] rounded-md border border-slate-300 px-3 py-2 text-base sm:text-sm text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";

  return (
    <form ref={formRef} action={postUpdate} className="rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-900">Post an update</h3>
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs text-slate-500">
            What did you get done today? <span className="text-red-500">*</span>
          </label>
          <textarea
            name="doneToday"
            required
            rows={3}
            className={inputClass}
            placeholder="e.g. Finished laying patio slabs at 42 Oak Lane, cleared all waste"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">What&apos;s up next?</label>
          <textarea
            name="upNext"
            rows={2}
            className={inputClass}
            placeholder="e.g. Tomorrow: grouting & pointing. Wednesday: start driveway at 15 Elm St"
          />
        </div>
        <button
          type="submit"
          className="min-h-[44px] w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 sm:w-auto"
        >
          Post update
        </button>
      </div>
    </form>
  );
}
