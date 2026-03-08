import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { NoteForm } from "./note-form";

const UPDATE_TYPE_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  photo: { label: "Photo", icon: "📷", color: "bg-blue-100 text-blue-700" },
  note: { label: "Note", icon: "📝", color: "bg-slate-100 text-slate-700" },
  status_change: { label: "Status", icon: "🔄", color: "bg-purple-100 text-purple-700" },
  cost_logged: { label: "Cost", icon: "💷", color: "bg-green-100 text-green-700" },
  daily_checkin: { label: "Check-in", icon: "✅", color: "bg-amber-100 text-amber-700" },
};

export default async function TimelinePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id: jobId } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: job } = await supabase
    .from("jobs")
    .select("id, client_name")
    .eq("id", jobId)
    .single();

  if (!job) redirect("/jobs");

  const { data: updates } = await supabase
    .from("job_updates")
    .select("id, user_id, update_type, content, photo_urls, created_at")
    .eq("job_id", jobId)
    .order("created_at", { ascending: false });

  // Get user names
  const userIds = [...new Set((updates ?? []).map((u) => u.user_id))];
  const { data: users } = userIds.length
    ? await supabase.from("users").select("id, name").in("id", userIds)
    : { data: [] };
  const userMap = new Map((users ?? []).map((u) => [u.id, u.name]));

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center gap-2">
        <Link href={`/jobs/${jobId}`} className="text-sm text-slate-400 hover:text-slate-600">&larr; Back to job</Link>
      </div>
      <h2 className="mt-2 text-xl font-semibold text-slate-900">
        Timeline — {job.client_name}
      </h2>

      {error && (
        <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {/* Add note form */}
      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">Add a note</h3>
        <NoteForm jobId={jobId} />
      </div>

      {/* Timeline feed */}
      {updates && updates.length > 0 ? (
        <div className="mt-6 space-y-1">
          {updates.map((update) => {
            const config = UPDATE_TYPE_CONFIG[update.update_type] ?? UPDATE_TYPE_CONFIG.note;
            const date = new Date(update.created_at);
            const timeStr = date.toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <div
                key={update.id}
                className="rounded-lg border border-slate-200 bg-white p-4"
              >
                <div className="flex items-start gap-3">
                  <span className={`mt-0.5 inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ${config.color}`}>
                    {config.icon} {config.label}
                  </span>
                  <div className="min-w-0 flex-1">
                    {update.content && (
                      <p className="text-sm text-slate-900 whitespace-pre-wrap">{update.content}</p>
                    )}
                    {update.photo_urls && update.photo_urls.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {update.photo_urls.map((url: string, i: number) => (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={url}
                              alt="Job photo"
                              className="h-24 w-24 rounded-md object-cover hover:opacity-90"
                            />
                          </a>
                        ))}
                      </div>
                    )}
                    <p className="mt-1.5 text-xs text-slate-400">
                      {userMap.get(update.user_id) ?? "Unknown"} &middot; {timeStr}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-6 text-sm text-slate-500">No activity yet.</p>
      )}
    </div>
  );
}
