"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function addNote(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const jobId = formData.get("jobId") as string;
  const content = formData.get("content") as string;

  if (!content.trim()) {
    redirect(`/jobs/${jobId}/timeline?error=Note+cannot+be+empty`);
  }

  const { error } = await supabase.from("job_updates").insert({
    job_id: jobId,
    user_id: user.id,
    update_type: "note",
    content,
  });

  if (error) {
    redirect(`/jobs/${jobId}/timeline?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/jobs/${jobId}/timeline`);
}
