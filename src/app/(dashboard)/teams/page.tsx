import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { deleteTeam } from "./actions";

export default async function TeamsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("company_id, role")
    .eq("id", user.id)
    .single();

  if (!profile || !["owner", "manager"].includes(profile.role)) {
    redirect("/");
  }

  const { data: teams } = await supabase
    .from("teams")
    .select("id, name, leader_id, created_at")
    .eq("company_id", profile.company_id)
    .order("created_at", { ascending: true });

  // Get leader names
  const leaderIds = (teams ?? []).map((t) => t.leader_id).filter(Boolean) as string[];
  const { data: leaders } = leaderIds.length
    ? await supabase
        .from("users")
        .select("id, name")
        .in("id", leaderIds)
    : { data: [] };

  const leaderMap = new Map((leaders ?? []).map((l) => [l.id, l.name]));

  // Get member counts per team
  const { data: allMembers } = await supabase
    .from("users")
    .select("team_id")
    .eq("company_id", profile.company_id)
    .not("team_id", "is", null);

  const memberCounts = new Map<string, number>();
  (allMembers ?? []).forEach((m) => {
    if (m.team_id) {
      memberCounts.set(m.team_id, (memberCounts.get(m.team_id) ?? 0) + 1);
    }
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900">Teams</h2>
        <Link
          href="/teams/new"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Add team
        </Link>
      </div>

      {error && (
        <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {(!teams || teams.length === 0) ? (
        <p className="mt-6 text-sm text-slate-500">
          No teams yet. Create your first team to get started.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 font-medium text-slate-700">Team</th>
                <th className="px-4 py-3 font-medium text-slate-700">Leader</th>
                <th className="px-4 py-3 font-medium text-slate-700">Members</th>
                <th className="px-4 py-3 font-medium text-slate-700"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {teams.map((team) => (
                <tr key={team.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">{team.name}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {team.leader_id ? leaderMap.get(team.leader_id) ?? "—" : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {memberCounts.get(team.id) ?? 0}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/teams/${team.id}/edit`}
                        className="rounded px-2 py-1 text-sm text-slate-600 hover:bg-slate-100"
                      >
                        Edit
                      </Link>
                      <form action={deleteTeam}>
                        <input type="hidden" name="teamId" value={team.id} />
                        <button
                          type="submit"
                          className="rounded px-2 py-1 text-sm text-red-600 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
