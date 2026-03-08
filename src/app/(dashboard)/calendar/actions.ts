"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function rescheduleJob(
  jobId: string,
  startDate: string,
  endDate: string,
  teamId: string | null
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("jobs")
    .update({
      start_date: startDate,
      end_date: endDate,
      ...(teamId !== undefined ? { team_id: teamId } : {}),
    })
    .eq("id", jobId);

  if (error) return { error: error.message };
  return { error: null };
}

export async function cascadeReschedule(
  moves: { jobId: string; startDate: string; endDate: string }[]
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  for (const move of moves) {
    const { error } = await supabase
      .from("jobs")
      .update({
        start_date: move.startDate,
        end_date: move.endDate,
      })
      .eq("id", move.jobId);

    if (error) return { error: error.message };
  }

  return { error: null };
}

export async function assignJobToTeam(jobId: string, teamId: string, startDate: string, endDate: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("jobs")
    .update({
      team_id: teamId,
      start_date: startDate,
      end_date: endDate,
    })
    .eq("id", jobId);

  if (error) return { error: error.message };
  return { error: null };
}
