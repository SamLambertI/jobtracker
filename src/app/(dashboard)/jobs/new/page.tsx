import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { JobForm } from "../job-form";

export default async function NewJobPage({
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
    redirect("/jobs");
  }

  const { data: teams } = await supabase
    .from("teams")
    .select("id, name")
    .eq("company_id", profile.company_id)
    .order("name");

  return (
    <div className="mx-auto max-w-2xl">
      <h2 className="text-xl font-semibold text-slate-900">Create new job</h2>

      {error && (
        <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <JobForm teams={teams ?? []} />
    </div>
  );
}
