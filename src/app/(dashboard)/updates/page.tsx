export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { UpdateForm } from "./update-form";
import { deleteUpdate } from "./actions";

export default async function UpdatesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; posted?: string }>;
}) {
  const params = await searchParams;
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

  // Fetch recent updates (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: updates } = await supabase
    .from("daily_updates")
    .select(
      `
      id,
      done_today,
      up_next,
      created_at,
      user_id,
      users!inner(name, role),
      teams(name)
    `
    )
    .eq("company_id", profile.company_id)
    .gte("created_at", sevenDaysAgo.toISOString())
    .order("created_at", { ascending: false });

  // Group by date
  const grouped: Record<string, typeof updates> = {};
  for (const update of updates ?? []) {
    const date = new Date(update.created_at).toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    if (!grouped[date]) grouped[date] = [];
    grouped[date]!.push(update);
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-900">Daily Updates</h2>

      {params.error && (
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          {params.error === "missing-fields"
            ? "Please fill in what you got done today."
            : params.error}
        </div>
      )}

      {params.posted && (
        <div className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-700">
          Update posted — your managers have been notified.
        </div>
      )}

      <UpdateForm />

      {/* Feed */}
      {Object.keys(grouped).length === 0 ? (
        <p className="text-sm text-slate-500">No updates yet. Be the first to post one!</p>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([date, dayUpdates]) => (
            <div key={date}>
              <h3 className="mb-3 text-sm font-semibold text-slate-500">{date}</h3>
              <div className="space-y-3">
                {dayUpdates!.map((update) => {
                  const userData = update.users as unknown as { name: string; role: string };
                  const teamData = update.teams as unknown as { name: string } | null;

                  return (
                    <div
                      key={update.id}
                      className="rounded-lg border border-slate-200 bg-white p-4"
                    >
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <div>
                          <span className="text-sm font-semibold text-slate-900">
                            {userData.name}
                          </span>
                          {teamData?.name && (
                            <span className="ml-2 text-xs text-slate-400">{teamData.name}</span>
                          )}
                          <span className="ml-2 text-xs text-slate-400">
                            {new Date(update.created_at).toLocaleTimeString("en-GB", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        {update.user_id === user.id && (
                          <form action={deleteUpdate}>
                            <input type="hidden" name="updateId" value={update.id} />
                            <button
                              type="submit"
                              className="text-xs text-slate-400 hover:text-red-600"
                            >
                              Delete
                            </button>
                          </form>
                        )}
                      </div>
                      <div className="space-y-2 text-sm text-slate-700">
                        <div>
                          <span className="font-medium text-slate-500">Done today: </span>
                          <span className="whitespace-pre-line">{update.done_today}</span>
                        </div>
                        {update.up_next && (
                          <div>
                            <span className="font-medium text-slate-500">Up next: </span>
                            <span className="whitespace-pre-line">{update.up_next}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
