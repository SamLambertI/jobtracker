"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { sendInviteEmail } from "@/lib/email";

export async function inviteUser(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("company_id, role, name")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "owner") {
    redirect("/members?error=Only+owners+can+invite+users");
  }

  const email = formData.get("email") as string;
  const role = formData.get("role") as string;
  const teamId = formData.get("teamId") as string;

  const { data: invite, error } = await supabase
    .from("invites")
    .insert({
      company_id: profile.company_id,
      email,
      role,
      team_id: teamId || null,
      invited_by: user.id,
    })
    .select("token")
    .single();

  if (error) {
    if (error.code === "23505") {
      redirect("/members?error=This+email+has+already+been+invited");
    }
    redirect(`/members?error=${encodeURIComponent(error.message)}`);
  }

  // Get company name for the email
  const { data: company } = await supabase
    .from("companies")
    .select("name")
    .eq("id", profile.company_id)
    .single();

  // Build the invite URL
  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const protocol = headersList.get("x-forwarded-proto") ?? "http";
  const inviteUrl = `${protocol}://${host}/accept-invite?token=${invite.token}`;

  // Send the email
  const { error: emailError } = await sendInviteEmail({
    to: email,
    inviterName: profile.name ?? "Your team",
    companyName: company?.name ?? "your company",
    role,
    inviteUrl,
  });

  if (emailError) {
    redirect(`/members?message=Invite+created+but+email+failed:+${encodeURIComponent(emailError)}.+Share+the+link+manually.`);
  }

  redirect("/members?message=Invite+sent+to+" + encodeURIComponent(email));
}

export async function removeUser(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "owner") {
    redirect("/members?error=Only+owners+can+remove+users");
  }

  const userId = formData.get("userId") as string;

  if (userId === user.id) {
    redirect("/members?error=You+cannot+remove+yourself");
  }

  const { error } = await supabase.from("users").delete().eq("id", userId);

  if (error) {
    redirect(`/members?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/members");
}

export async function cancelInvite(formData: FormData) {
  const supabase = await createClient();
  const inviteId = formData.get("inviteId") as string;

  const { error } = await supabase.from("invites").delete().eq("id", inviteId);

  if (error) {
    redirect(`/members?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/members");
}

export async function updateUserTeam(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["owner", "manager"].includes(profile.role)) {
    redirect("/members?error=Unauthorized");
  }

  const userId = formData.get("userId") as string;
  const teamId = formData.get("teamId") as string;

  const { error } = await supabase
    .from("users")
    .update({ team_id: teamId || null })
    .eq("id", userId);

  if (error) {
    redirect(`/members?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/members");
}
