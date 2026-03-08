import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { JobForm } from "../../job-form";

export default async function EditJobPage({
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
    redirect("/jobs");
  }

  const { data: job } = await supabase
    .from("jobs")
    .select("id, client_name, client_address, client_email, client_phone, description, team_id, status, start_date, end_date")
    .eq("id", id)
    .single();

  if (!job) redirect("/jobs");

  const { data: teams } = await supabase
    .from("teams")
    .select("id, name")
    .eq("company_id", profile.company_id)
    .order("name");

  return (
    <div className="mx-auto max-w-2xl">
      <h2 className="text-xl font-semibold text-slate-900">Edit job</h2>

      {error && (
        <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <JobForm teams={teams ?? []} job={job} />
    </div>
  );
}
