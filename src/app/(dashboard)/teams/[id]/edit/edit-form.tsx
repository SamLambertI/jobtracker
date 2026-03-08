"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { updateTeam } from "../../actions";
import Link from "next/link";

const editTeamSchema = z.object({
  name: z.string().min(1, "Team name is required"),
  leaderId: z.string(),
});

type EditTeamForm = z.infer<typeof editTeamSchema>;

export function EditTeamForm({
  team,
  leaders,
}: {
  team: { id: string; name: string; leader_id: string | null };
  leaders: { id: string; name: string; role: string }[];
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EditTeamForm>({
    resolver: zodResolver(editTeamSchema),
    defaultValues: {
      name: team.name,
      leaderId: team.leader_id ?? "",
    },
  });

  const onSubmit = (data: EditTeamForm) => {
    const formData = new FormData();
    formData.append("teamId", team.id);
    formData.append("name", data.name);
    formData.append("leaderId", data.leaderId);
    updateTeam(formData);
  };

  return (
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
        />
        {errors.name && (
          <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="leaderId" className="mb-1 block text-sm font-medium text-slate-700">
          Team leader
        </label>
        <select
          id="leaderId"
          {...register("leaderId")}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        >
          <option value="">No leader assigned</option>
          {leaders.map((leader) => (
            <option key={leader.id} value={leader.id}>
              {leader.name} ({leader.role.replace("_", " ")})
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {isSubmitting ? "Saving..." : "Save changes"}
        </button>
        <Link href="/teams" className="text-sm text-slate-500 hover:text-slate-900">
          Cancel
        </Link>
      </div>
    </form>
  );
}
