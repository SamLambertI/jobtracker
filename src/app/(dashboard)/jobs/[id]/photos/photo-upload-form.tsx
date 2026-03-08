"use client";

import { useRef } from "react";
import { uploadPhoto } from "./actions";

export function PhotoUploadForm({ jobId }: { jobId: string }) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={uploadPhoto} className="space-y-3">
      <input type="hidden" name="jobId" value={jobId} />

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1">
          <label className="mb-1 block text-xs text-slate-500">Photo</label>
          <input
            name="photo"
            type="file"
            accept="image/*"
            capture="environment"
            required
            className="w-full text-sm text-slate-500 file:mr-2 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
          />
        </div>
        <div className="min-w-[200px] flex-1">
          <label className="mb-1 block text-xs text-slate-500">Caption (optional)</label>
          <input
            name="caption"
            type="text"
            placeholder="e.g. Patio base complete"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Upload
        </button>
      </div>
    </form>
  );
}
