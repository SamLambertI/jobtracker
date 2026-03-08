"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { createTeam } from "../actions";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const teamSchema = z.object({
  name: z.string().min(1, "Team name is required"),
});

type TeamForm = z.infer<typeof teamSchema>;

function NewTeamForm() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TeamForm>({
    resolver: zodResolver(teamSchema),
  });

  const onSubmit = (data: TeamForm) => {
    const formData = new FormData();
    formData.append("name", data.name);
    createTeam(formData);
  };

  return (
    <div className="mx-auto max-w-lg">
      <h2 className="text-xl font-semibold text-slate-900">Create team</h2>

      {error && (
        <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium text-slate-700">
            Team name
          </label>
          <input
            id="name"
            type="text"
            {...register("name")}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            placeholder="e.g. Install Team 1"
          />
          {errors.name && (
            <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {isSubmitting ? "Creating..." : "Create team"}
          </button>
          <Link href="/teams" className="text-sm text-slate-500 hover:text-slate-900">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

export default function NewTeamPage() {
  return (
    <Suspense>
      <NewTeamForm />
    </Suspense>
  );
}
