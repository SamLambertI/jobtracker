"use client";

import { useRef } from "react";
import { addNote } from "./actions";

export function NoteForm({ jobId }: { jobId: string }) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={addNote} className="flex gap-3">
      <input type="hidden" name="jobId" value={jobId} />
      <textarea
        name="content"
        rows={2}
        required
        placeholder="Add a note about this job..."
        className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
      />
      <button
        type="submit"
        className="self-end rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
      >
        Post
      </button>
    </form>
  );
}
