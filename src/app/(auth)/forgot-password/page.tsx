"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { forgotPassword } from "../actions";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const forgotSchema = z.object({
  email: z.email("Please enter a valid email"),
});

type ForgotForm = z.infer<typeof forgotSchema>;

function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const message = searchParams.get("message");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotForm>({
    resolver: zodResolver(forgotSchema),
  });

  const onSubmit = (data: ForgotForm) => {
    const formData = new FormData();
    formData.append("email", data.email);
    forgotPassword(formData);
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="mb-2 text-2xl font-bold text-slate-900">Reset password</h1>
      <p className="mb-6 text-sm text-slate-500">
        Enter your email and we&apos;ll send you a reset link.
      </p>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {message && (
        <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-700">
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            {...register("email")}
            className="w-full min-h-[44px] rounded-md border border-slate-300 px-3 py-2 text-base sm:text-sm text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            placeholder="sam@lamberts.co.uk"
          />
          {errors.email && (
            <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full min-h-[48px] rounded-md bg-slate-900 px-4 py-2.5 text-base sm:text-sm font-medium text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {isSubmitting ? "Sending..." : "Send reset link"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-slate-500">
        <Link href="/login" className="font-medium text-slate-900 hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense>
      <ForgotPasswordForm />
    </Suspense>
  );
}
