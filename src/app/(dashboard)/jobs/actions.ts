"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function createJob(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("company_id, role")
    .eq("id", user.id)
    .single();

  if (!profile || !["owner", "manager"].includes(profile.role)) {
    redirect("/jobs?error=Unauthorized");
  }

  const { data: job, error } = await supabase
    .from("jobs")
    .insert({
      company_id: profile.company_id,
      client_name: formData.get("clientName") as string,
      client_address: (formData.get("clientAddress") as string) || null,
      client_email: (formData.get("clientEmail") as string) || null,
      client_phone: (formData.get("clientPhone") as string) || null,
      description: formData.get("description") as string,
      team_id: (formData.get("teamId") as string) || null,
      status: (formData.get("status") as string) || "quoted",
      start_date: (formData.get("startDate") as string) || null,
      end_date: (formData.get("endDate") as string) || null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) {
    redirect(`/jobs/new?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/jobs/${job.id}`);
}

export async function updateJob(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const jobId = formData.get("jobId") as string;

  const { error } = await supabase
    .from("jobs")
    .update({
      client_name: formData.get("clientName") as string,
      client_address: (formData.get("clientAddress") as string) || null,
      client_email: (formData.get("clientEmail") as string) || null,
      client_phone: (formData.get("clientPhone") as string) || null,
      description: formData.get("description") as string,
      team_id: (formData.get("teamId") as string) || null,
      status: formData.get("status") as string,
      start_date: (formData.get("startDate") as string) || null,
      end_date: (formData.get("endDate") as string) || null,
    })
    .eq("id", jobId);

  if (error) {
    redirect(`/jobs/${jobId}/edit?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/jobs/${jobId}`);
}

export async function deleteJob(formData: FormData) {
  const supabase = await createClient();
  const jobId = formData.get("jobId") as string;

  const { error } = await supabase.from("jobs").delete().eq("id", jobId);

  if (error) {
    redirect(`/jobs/${jobId}?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/jobs");
}

export async function updateJobStatus(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const jobId = formData.get("jobId") as string;
  const status = formData.get("status") as string;

  const { error } = await supabase
    .from("jobs")
    .update({ status })
    .eq("id", jobId);

  if (error) {
    redirect(`/jobs/${jobId}?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/jobs/${jobId}`);
}
