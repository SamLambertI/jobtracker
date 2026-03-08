"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function addQuotedCost(formData: FormData) {
  const supabase = await createClient();
  const jobId = formData.get("jobId") as string;

  const { error } = await supabase.from("quoted_costs").insert({
    job_id: jobId,
    category: formData.get("category") as string,
    description: formData.get("description") as string,
    quantity: parseFloat(formData.get("quantity") as string),
    unit: formData.get("unit") as string,
    unit_cost: parseFloat(formData.get("unitCost") as string),
    sort_order: parseInt(formData.get("sortOrder") as string) || 0,
  });

  if (error) {
    redirect(`/jobs/${jobId}/quoted-costs?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/jobs/${jobId}/quoted-costs`);
}

export async function updateQuotedCost(formData: FormData) {
  const supabase = await createClient();
  const jobId = formData.get("jobId") as string;
  const costId = formData.get("costId") as string;

  const { error } = await supabase
    .from("quoted_costs")
    .update({
      category: formData.get("category") as string,
      description: formData.get("description") as string,
      quantity: parseFloat(formData.get("quantity") as string),
      unit: formData.get("unit") as string,
      unit_cost: parseFloat(formData.get("unitCost") as string),
      sort_order: parseInt(formData.get("sortOrder") as string) || 0,
    })
    .eq("id", costId);

  if (error) {
    redirect(`/jobs/${jobId}/quoted-costs?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/jobs/${jobId}/quoted-costs`);
}

export async function deleteQuotedCost(formData: FormData) {
  const supabase = await createClient();
  const jobId = formData.get("jobId") as string;
  const costId = formData.get("costId") as string;

  const { error } = await supabase.from("quoted_costs").delete().eq("id", costId);

  if (error) {
    redirect(`/jobs/${jobId}/quoted-costs?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/jobs/${jobId}/quoted-costs`);
}
