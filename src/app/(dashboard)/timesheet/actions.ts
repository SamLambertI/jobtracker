"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function clockIn(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("company_id")
    .eq("id", user.id)
    .single();

  if (!profile?.company_id) redirect("/login");

  const jobId = (formData.get("jobId") as string) || null;
  const lat = formData.get("lat") as string;
  const lng = formData.get("lng") as string;
  const returnTo = (formData.get("returnTo") as string) || "/clock";

  const { error } = await supabase.from("time_entries").insert({
    company_id: profile.company_id,
    user_id: user.id,
    job_id: jobId || null,
    clock_in_lat: lat ? parseFloat(lat) : null,
    clock_in_lng: lng ? parseFloat(lng) : null,
  });

  if (error) {
    redirect(`/clock?error=${encodeURIComponent(error.message)}`);
  }

  redirect(returnTo);
}

export async function clockOut(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const entryId = formData.get("entryId") as string;
  const lat = formData.get("lat") as string;
  const lng = formData.get("lng") as string;
  const returnTo = (formData.get("returnTo") as string) || "/clock";

  const { error } = await supabase
    .from("time_entries")
    .update({
      clock_out: new Date().toISOString(),
      clock_out_lat: lat ? parseFloat(lat) : null,
      clock_out_lng: lng ? parseFloat(lng) : null,
    })
    .eq("id", entryId)
    .eq("user_id", user.id);

  if (error) {
    redirect(`/clock?error=${encodeURIComponent(error.message)}`);
  }

  redirect(returnTo);
}

export async function assignJob(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const entryId = formData.get("entryId") as string;
  const jobId = (formData.get("jobId") as string) || null;

  await supabase
    .from("time_entries")
    .update({ job_id: jobId || null })
    .eq("id", entryId)
    .eq("user_id", user.id);

  redirect("/clock");
}

export async function deleteTimeEntry(formData: FormData) {
  const supabase = await createClient();
  const entryId = formData.get("entryId") as string;
  const returnTo = (formData.get("returnTo") as string) || "/timesheet";

  await supabase.from("time_entries").delete().eq("id", entryId);

  redirect(returnTo);
}
