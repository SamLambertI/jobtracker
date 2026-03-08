import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CalendarView } from "./calendar-view";

export default async function CalendarPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("company_id, role, team_id")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  const canViewAll = ["owner", "manager"].includes(profile.role);
  const canEdit = ["owner", "manager", "team_leader"].includes(profile.role);

  // Load teams
  const { data: teams } = await supabase
    .from("teams")
    .select("id, name")
    .eq("company_id", profile.company_id)
    .order("name");

  // Load all non-invoiced jobs
  let jobsQuery = supabase
    .from("jobs")
    .select("id, client_name, description, status, team_id, start_date, end_date, quoted_total, actual_total")
    .eq("company_id", profile.company_id)
    .neq("status", "invoiced");

  if (!canViewAll && profile.team_id) {
    jobsQuery = jobsQuery.eq("team_id", profile.team_id);
  }

  const { data: jobs } = await jobsQuery;

  return (
    <CalendarView
      teams={teams ?? []}
      initialJobs={jobs ?? []}
      companyId={profile.company_id}
      userTeamId={profile.team_id}
      canViewAll={canViewAll}
      canEdit={canEdit}
    />
  );
}
