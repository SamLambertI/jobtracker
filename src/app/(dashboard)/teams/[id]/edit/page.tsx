import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { EditTeamForm } from "./edit-form";

export default async function EditTeamPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
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

  const { data: team } = await supabase
    .from("teams")
    .select("id, name, leader_id")
    .eq("id", id)
    .eq("company_id", profile.company_id)
    .single();

  if (!team) redirect("/teams");

  // Get eligible leaders (team_leaders and managers in the company)
  const { data: eligibleLeaders } = await supabase
    .from("users")
    .select("id, name, role")
    .eq("company_id", profile.company_id)
    .in("role", ["team_leader", "manager", "owner"]);

  return (
    <div className="mx-auto max-w-lg">
      <h2 className="text-xl font-semibold text-slate-900">Edit team</h2>

      {error && (
        <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <EditTeamForm team={team} leaders={eligibleLeaders ?? []} />
    </div>
  );
}
