"use client";

import { updateUserTeam } from "./actions";

export function TeamSelect({
  userId,
  currentTeamId,
  teams,
}: {
  userId: string;
  currentTeamId: string | null;
  teams: { id: string; name: string }[];
}) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const formData = new FormData();
    formData.append("userId", userId);
    formData.append("teamId", e.target.value);
    updateUserTeam(formData);
  };

  return (
    <select
      defaultValue={currentTeamId ?? ""}
      onChange={handleChange}
      className="min-h-[36px] rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-700 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
    >
      <option value="">No team</option>
      {teams.map((t) => (
        <option key={t.id} value={t.id}>
          {t.name}
        </option>
      ))}
    </select>
  );
}
