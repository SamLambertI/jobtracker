"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function createTeam(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("company_id, role")
    .eq("id", user.id)
    .single();

  if (!profile || !["owner", "manager"].includes(profile.role)) {
    redirect("/teams?error=Unauthorized");
  }

  const name = formData.get("name") as string;

  const { error } = await supabase.from("teams").insert({
    company_id: profile.company_id,
    name,
  });

  if (error) {
    redirect(`/teams/new?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/teams");
}

export async function updateTeam(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const teamId = formData.get("teamId") as string;
  const name = formData.get("name") as string;
  const leaderId = formData.get("leaderId") as string;

  const { error } = await supabase
    .from("teams")
    .update({
      name,
      leader_id: leaderId || null,
    })
    .eq("id", teamId);

  if (error) {
    redirect(`/teams/${teamId}/edit?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/teams");
}

export async function deleteTeam(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const teamId = formData.get("teamId") as string;

  const { error } = await supabase.from("teams").delete().eq("id", teamId);

  if (error) {
    redirect(`/teams?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/teams");
}
