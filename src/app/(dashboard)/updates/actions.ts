"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { sendUpdateNotification } from "@/lib/email";

export async function postUpdate(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("company_id, team_id, name")
    .eq("id", user.id)
    .single();

  if (!profile?.company_id) redirect("/updates?error=no-company");

  const doneToday = formData.get("doneToday") as string;
  const upNext = formData.get("upNext") as string;

  if (!doneToday?.trim()) redirect("/updates?error=missing-fields");

  const { error } = await supabase.from("daily_updates").insert({
    company_id: profile.company_id,
    team_id: profile.team_id,
    user_id: user.id,
    done_today: doneToday.trim(),
    up_next: upNext?.trim() || null,
  });

  if (error) redirect(`/updates?error=${encodeURIComponent(error.message)}`);

  // Notify managers/owners in the background (don't block the redirect)
  notifyManagers(supabase, profile, doneToday.trim(), upNext?.trim() || null).catch(
    () => {} // swallow errors — notification is best-effort
  );

  redirect("/updates?posted=1");
}

async function notifyManagers(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profile: { company_id: string; team_id: string | null; name: string },
  doneToday: string,
  upNext: string | null
) {
  // Get team name if assigned
  let teamName: string | null = null;
  if (profile.team_id) {
    const { data: team } = await supabase
      .from("teams")
      .select("name")
      .eq("id", profile.team_id)
      .single();
    teamName = team?.name ?? null;
  }

  // Get managers and owners in the company
  const { data: managers } = await supabase
    .from("users")
    .select("email")
    .eq("company_id", profile.company_id)
    .in("role", ["owner", "manager"]);

  if (!managers?.length) return;

  const emails = managers.map((m) => m.email).filter(Boolean);
  if (!emails.length) return;

  await sendUpdateNotification({
    to: emails,
    authorName: profile.name,
    teamName,
    doneToday,
    upNext,
  });
}

export async function deleteUpdate(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const updateId = formData.get("updateId") as string;
  if (!updateId) redirect("/updates");

  await supabase.from("daily_updates").delete().eq("id", updateId).eq("user_id", user.id);

  redirect("/updates");
}
