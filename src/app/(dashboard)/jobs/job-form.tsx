"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { createJob, updateJob } from "./actions";
import Link from "next/link";
import { JOB_STATUSES } from "@/lib/constants";

const jobSchema = z.object({
  clientName: z.string().min(1, "Client name is required"),
  clientAddress: z.string(),
  clientEmail: z.string(),
  clientPhone: z.string(),
  description: z.string().min(1, "Description is required"),
  teamId: z.string(),
  status: z.string(),
  startDate: z.string(),
  endDate: z.string(),
});

type JobFormData = z.infer<typeof jobSchema>;

interface JobFormProps {
  teams: { id: string; name: string }[];
  job?: {
    id: string;
    client_name: string;
    client_address: string | null;
    client_email: string | null;
    client_phone: string | null;
    description: string;
    team_id: string | null;
    status: string;
    start_date: string | null;
    end_date: string | null;
  };
}

export function JobForm({ teams, job }: JobFormProps) {
  const isEditing = !!job;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<JobFormData>({
    resolver: zodResolver(jobSchema),
    defaultValues: {
      clientName: job?.client_name ?? "",
      clientAddress: job?.client_address ?? "",
      clientEmail: job?.client_email ?? "",
      clientPhone: job?.client_phone ?? "",
      description: job?.description ?? "",
      teamId: job?.team_id ?? "",
      status: job?.status ?? "quoted",
      startDate: job?.start_date ?? "",
      endDate: job?.end_date ?? "",
    },
  });

  const onSubmit = (data: JobFormData) => {
    const formData = new FormData();
    if (job) formData.append("jobId", job.id);
    formData.append("clientName", data.clientName);
    formData.append("clientAddress", data.clientAddress);
    formData.append("clientEmail", data.clientEmail);
    formData.append("clientPhone", data.clientPhone);
    formData.append("description", data.description);
    formData.append("teamId", data.teamId);
    formData.append("status", data.status);
    formData.append("startDate", data.startDate);
    formData.append("endDate", data.endDate);
    isEditing ? updateJob(formData) : createJob(formData);
  };

  const inputClass =
    "w-full min-h-[44px] rounded-md border border-slate-300 px-3 py-2 text-base sm:text-sm text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-6">
      {/* Client details */}
      <fieldset className="rounded-lg border border-slate-200 bg-white p-4">
        <legend className="px-2 text-sm font-semibold text-slate-700">Client details</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="clientName" className="mb-1 block text-sm text-slate-600">
              Client name *
            </label>
            <input id="clientName" type="text" {...register("clientName")} className={inputClass} placeholder="e.g. Mr & Mrs Smith" />
            {errors.clientName && <p className="mt-1 text-xs text-red-600">{errors.clientName.message}</p>}
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="clientAddress" className="mb-1 block text-sm text-slate-600">Address</label>
            <input id="clientAddress" type="text" {...register("clientAddress")} className={inputClass} placeholder="123 High Street, Kent" />
          </div>
          <div>
            <label htmlFor="clientEmail" className="mb-1 block text-sm text-slate-600">Email</label>
            <input id="clientEmail" type="email" {...register("clientEmail")} className={inputClass} />
          </div>
          <div>
            <label htmlFor="clientPhone" className="mb-1 block text-sm text-slate-600">Phone</label>
            <input id="clientPhone" type="tel" {...register("clientPhone")} className={inputClass} />
          </div>
        </div>
      </fieldset>

      {/* Job details */}
      <fieldset className="rounded-lg border border-slate-200 bg-white p-4">
        <legend className="px-2 text-sm font-semibold text-slate-700">Job details</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="description" className="mb-1 block text-sm text-slate-600">
              Description *
            </label>
            <textarea
              id="description"
              rows={3}
              {...register("description")}
              className={inputClass}
              placeholder="e.g. Full patio and retaining wall build, 45m²"
            />
            {errors.description && <p className="mt-1 text-xs text-red-600">{errors.description.message}</p>}
          </div>
          <div>
            <label htmlFor="teamId" className="mb-1 block text-sm text-slate-600">Assigned team</label>
            <select id="teamId" {...register("teamId")} className={inputClass}>
              <option value="">Unassigned</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="status" className="mb-1 block text-sm text-slate-600">Status</label>
            <select id="status" {...register("status")} className={inputClass}>
              {JOB_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="startDate" className="mb-1 block text-sm text-slate-600">Start date</label>
            <input id="startDate" type="date" {...register("startDate")} className={inputClass} />
          </div>
          <div>
            <label htmlFor="endDate" className="mb-1 block text-sm text-slate-600">End date</label>
            <input id="endDate" type="date" {...register("endDate")} className={inputClass} />
          </div>
        </div>
      </fieldset>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="min-h-[44px] rounded-md bg-slate-900 px-5 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {isSubmitting ? "Saving..." : isEditing ? "Save changes" : "Create job"}
        </button>
        <Link href={isEditing ? `/jobs/${job.id}` : "/jobs"} className="text-sm text-slate-500 hover:text-slate-900">
          Cancel
        </Link>
      </div>
    </form>
  );
}
