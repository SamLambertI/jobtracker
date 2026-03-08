"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { resetPassword } from "../actions";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const resetSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ResetForm = z.infer<typeof resetSchema>;

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
  });

  const onSubmit = (data: ResetForm) => {
    const formData = new FormData();
    formData.append("password", data.password);
    resetPassword(formData);
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="mb-2 text-2xl font-bold text-slate-900">Set new password</h1>
      <p className="mb-6 text-sm text-slate-500">
        Enter your new password below.
      </p>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
            New password
          </label>
          <input
            id="password"
            type="password"
            {...register("password")}
            className="w-full min-h-[44px] rounded-md border border-slate-300 px-3 py-2 text-base sm:text-sm text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            placeholder="••••••••"
          />
          {errors.password && (
            <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium text-slate-700">
            Confirm new password
          </label>
          <input
            id="confirmPassword"
            type="password"
            {...register("confirmPassword")}
            className="w-full min-h-[44px] rounded-md border border-slate-300 px-3 py-2 text-base sm:text-sm text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            placeholder="••••••••"
          />
          {errors.confirmPassword && (
            <p className="mt-1 text-xs text-red-600">{errors.confirmPassword.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full min-h-[48px] rounded-md bg-slate-900 px-4 py-2.5 text-base sm:text-sm font-medium text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {isSubmitting ? "Updating..." : "Update password"}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
