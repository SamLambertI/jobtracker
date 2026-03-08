import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { removeUser, cancelInvite } from "./actions";
import { InviteForm } from "./invite-form";
import { CopyButton } from "./copy-button";

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("company_id, role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "owner") {
    redirect("/");
  }

  // Get all users in the company
  const { data: members } = await supabase
    .from("users")
    .select("id, name, email, role, team_id")
    .eq("company_id", profile.company_id)
    .order("created_at", { ascending: true });

  // Get teams for the invite form and display
  const { data: teams } = await supabase
    .from("teams")
    .select("id, name")
    .eq("company_id", profile.company_id)
    .order("name");

  const teamMap = new Map((teams ?? []).map((t) => [t.id, t.name]));

  // Get pending invites
  const { data: invites } = await supabase
    .from("invites")
    .select("id, email, role, team_id, token, created_at")
    .eq("company_id", profile.company_id)
    .is("accepted_at", null)
    .order("created_at", { ascending: false });

  // Build base URL for invite links
  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const protocol = headersList.get("x-forwarded-proto") ?? "http";
  const baseUrl = `${protocol}://${host}`;

  return (
    <div>
      <h2 className="text-xl font-semibold text-slate-900">Team Members</h2>

      {error && (
        <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}
      {message && (
        <div className="mt-4 rounded-md bg-green-50 p-3 text-sm text-green-700">{message}</div>
      )}

      {/* Invite form */}
      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-6">
        <h3 className="mb-4 text-sm font-semibold text-slate-900">Invite a team member</h3>
        <InviteForm teams={teams ?? []} />
      </div>

      {/* Current members */}
      <div className="mt-6">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">
          Current members ({members?.length ?? 0})
        </h3>
        {/* Desktop table */}
        <div className="hidden overflow-x-auto rounded-lg border border-slate-200 bg-white sm:block">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 font-medium text-slate-700">Name</th>
                <th className="px-4 py-3 font-medium text-slate-700">Email</th>
                <th className="px-4 py-3 font-medium text-slate-700">Role</th>
                <th className="px-4 py-3 font-medium text-slate-700">Team</th>
                <th className="px-4 py-3 font-medium text-slate-700"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(members ?? []).map((member) => (
                <tr key={member.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">{member.name}</td>
                  <td className="px-4 py-3 text-slate-600">{member.email}</td>
                  <td className="px-4 py-3">
                    <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                      {member.role.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {member.team_id ? teamMap.get(member.team_id) ?? "—" : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {member.id !== user.id && (
                      <form action={removeUser}>
                        <input type="hidden" name="userId" value={member.id} />
                        <button
                          type="submit"
                          className="rounded px-2 py-1 text-sm text-red-600 hover:bg-red-50"
                        >
                          Remove
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Mobile card layout */}
        <div className="space-y-2 sm:hidden">
          {(members ?? []).map((member) => (
            <div key={member.id} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium text-slate-900">{member.name}</div>
                  <div className="mt-0.5 text-sm text-slate-500">{member.email}</div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                      {member.role.replace("_", " ")}
                    </span>
                    {member.team_id && (
                      <span className="text-xs text-slate-500">{teamMap.get(member.team_id) ?? "—"}</span>
                    )}
                  </div>
                </div>
                {member.id !== user.id && (
                  <form action={removeUser}>
                    <input type="hidden" name="userId" value={member.id} />
                    <button
                      type="submit"
                      className="min-h-[44px] min-w-[44px] rounded px-2 py-1 text-sm text-red-600 hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </form>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pending invites */}
      {invites && invites.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">
            Pending invites ({invites.length})
          </h3>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-lg border border-slate-200 bg-white sm:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 font-medium text-slate-700">Email</th>
                  <th className="px-4 py-3 font-medium text-slate-700">Role</th>
                  <th className="px-4 py-3 font-medium text-slate-700">Team</th>
                  <th className="px-4 py-3 font-medium text-slate-700">Link</th>
                  <th className="px-4 py-3 font-medium text-slate-700"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invites.map((invite) => (
                  <tr key={invite.id}>
                    <td className="px-4 py-3 text-slate-900">{invite.email}</td>
                    <td className="px-4 py-3">
                      <span className="inline-block rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                        {invite.role.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {invite.team_id ? teamMap.get(invite.team_id) ?? "—" : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <CopyButton text={`${baseUrl}/accept-invite?token=${invite.token}`} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <form action={cancelInvite}>
                        <input type="hidden" name="inviteId" value={invite.id} />
                        <button
                          type="submit"
                          className="rounded px-2 py-1 text-sm text-red-600 hover:bg-red-50"
                        >
                          Cancel
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile card layout */}
          <div className="space-y-2 sm:hidden">
            {invites.map((invite) => (
              <div key={invite.id} className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium text-slate-900">{invite.email}</div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className="inline-block rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                        {invite.role.replace("_", " ")}
                      </span>
                      {invite.team_id && (
                        <span className="text-xs text-slate-500">{teamMap.get(invite.team_id) ?? "—"}</span>
                      )}
                    </div>
                    <div className="mt-2">
                      <CopyButton text={`${baseUrl}/accept-invite?token=${invite.token}`} />
                    </div>
                  </div>
                  <form action={cancelInvite}>
                    <input type="hidden" name="inviteId" value={invite.id} />
                    <button
                      type="submit"
                      className="min-h-[44px] min-w-[44px] rounded px-2 py-1 text-sm text-red-600 hover:bg-red-50"
                    >
                      Cancel
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
