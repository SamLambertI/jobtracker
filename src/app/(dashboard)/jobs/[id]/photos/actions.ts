"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function uploadPhoto(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const jobId = formData.get("jobId") as string;
  const caption = (formData.get("caption") as string) || null;
  const file = formData.get("photo") as File;

  if (!file || file.size === 0) {
    redirect(`/jobs/${jobId}/photos?error=No+file+selected`);
  }

  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `photos/${jobId}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("job-photos")
    .upload(path, file);

  if (uploadError) {
    redirect(`/jobs/${jobId}/photos?error=${encodeURIComponent(uploadError.message)}`);
  }

  const { data: urlData } = supabase.storage
    .from("job-photos")
    .getPublicUrl(path);

  // Save photo record
  const { error: dbError } = await supabase.from("photos").insert({
    job_id: jobId,
    user_id: user.id,
    storage_path: path,
    url: urlData.publicUrl,
    caption,
  });

  if (dbError) {
    redirect(`/jobs/${jobId}/photos?error=${encodeURIComponent(dbError.message)}`);
  }

  // Add to timeline
  await supabase.from("job_updates").insert({
    job_id: jobId,
    user_id: user.id,
    update_type: "photo",
    content: caption || "Photo uploaded",
    photo_urls: [urlData.publicUrl],
  });

  redirect(`/jobs/${jobId}/photos`);
}

export async function deletePhoto(formData: FormData) {
  const supabase = await createClient();
  const jobId = formData.get("jobId") as string;
  const photoId = formData.get("photoId") as string;
  const storagePath = formData.get("storagePath") as string;

  // Delete from storage
  await supabase.storage.from("job-photos").remove([storagePath]);

  // Delete record
  const { error } = await supabase.from("photos").delete().eq("id", photoId);

  if (error) {
    redirect(`/jobs/${jobId}/photos?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/jobs/${jobId}/photos`);
}
