"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function addActualCost(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const jobId = formData.get("jobId") as string;
  const receiptFile = formData.get("receipt") as File | null;

  let receiptPhotoUrl: string | null = null;

  if (receiptFile && receiptFile.size > 0) {
    const ext = receiptFile.name.split(".").pop() ?? "jpg";
    const path = `receipts/${jobId}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("job-photos")
      .upload(path, receiptFile);

    if (!uploadError) {
      const { data: urlData } = supabase.storage
        .from("job-photos")
        .getPublicUrl(path);
      receiptPhotoUrl = urlData.publicUrl;
    }
  }

  const { error } = await supabase.from("actual_costs").insert({
    job_id: jobId,
    category: formData.get("category") as string,
    description: formData.get("description") as string,
    quantity: parseFloat(formData.get("quantity") as string),
    unit: formData.get("unit") as string,
    unit_cost: parseFloat(formData.get("unitCost") as string),
    logged_by: user.id,
    receipt_photo_url: receiptPhotoUrl,
  });

  if (error) {
    redirect(`/jobs/${jobId}/actual-costs?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/jobs/${jobId}/actual-costs`);
}

export async function updateActualCost(formData: FormData) {
  const supabase = await createClient();
  const jobId = formData.get("jobId") as string;
  const costId = formData.get("costId") as string;

  const { error } = await supabase
    .from("actual_costs")
    .update({
      category: formData.get("category") as string,
      description: formData.get("description") as string,
      quantity: parseFloat(formData.get("quantity") as string),
      unit: formData.get("unit") as string,
      unit_cost: parseFloat(formData.get("unitCost") as string),
    })
    .eq("id", costId);

  if (error) {
    redirect(`/jobs/${jobId}/actual-costs?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/jobs/${jobId}/actual-costs`);
}

export async function deleteActualCost(formData: FormData) {
  const supabase = await createClient();
  const jobId = formData.get("jobId") as string;
  const costId = formData.get("costId") as string;

  const { error } = await supabase.from("actual_costs").delete().eq("id", costId);

  if (error) {
    redirect(`/jobs/${jobId}/actual-costs?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/jobs/${jobId}/actual-costs`);
}
