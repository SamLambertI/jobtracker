"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { inviteUser } from "./actions";

const inviteSchema = z.object({
  email: z.email("Please enter a valid email"),
  role: z.enum(["manager", "team_leader", "operative"]),
  teamId: z.string(),
});

type InviteFormData = z.infer<typeof inviteSchema>;

export function InviteForm({
  teams,
}: {
  teams: { id: string; name: string }[];
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      role: "operative",
      teamId: "",
    },
  });

  const onSubmit = (data: InviteFormData) => {
    const formData = new FormData();
    formData.append("email", data.email);
    formData.append("role", data.role);
    formData.append("teamId", data.teamId);
    inviteUser(formData);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-wrap items-end gap-3">
      <div className="min-w-[200px] flex-1">
        <label htmlFor="email" className="mb-1 block text-sm text-slate-600">
          Email
        </label>
        <input
          id="email"
          type="email"
          {...register("email")}
          className="w-full min-h-[44px] rounded-md border border-slate-300 px-3 py-2 text-base sm:text-sm text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          placeholder="team@example.com"
        />
        {errors.email && (
          <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
        )}
      </div>

      <div className="w-40">
        <label htmlFor="role" className="mb-1 block text-sm text-slate-600">
          Role
        </label>
        <select
          id="role"
          {...register("role")}
          className="w-full min-h-[44px] rounded-md border border-slate-300 px-3 py-2 text-base sm:text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        >
          <option value="manager">Manager</option>
          <option value="team_leader">Team leader</option>
          <option value="operative">Operative</option>
        </select>
      </div>

      <div className="w-40">
        <label htmlFor="teamId" className="mb-1 block text-sm text-slate-600">
          Team
        </label>
        <select
          id="teamId"
          {...register("teamId")}
          className="w-full min-h-[44px] rounded-md border border-slate-300 px-3 py-2 text-base sm:text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        >
          <option value="">No team</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="min-h-[44px] rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {isSubmitting ? "Sending..." : "Send invite"}
      </button>
    </form>
  );
}
