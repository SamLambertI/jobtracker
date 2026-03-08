"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { signup } from "../actions";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const signupSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    companyName: z.string().min(2, "Company name must be at least 2 characters"),
    email: z.email("Please enter a valid email"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type SignupForm = z.infer<typeof signupSchema>;

function SignupForm() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const message = searchParams.get("message");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = (data: SignupForm) => {
    const formData = new FormData();
    formData.append("name", data.name);
    formData.append("companyName", data.companyName);
    formData.append("email", data.email);
    formData.append("password", data.password);
    signup(formData);
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="mb-2 text-2xl font-bold text-slate-900">Create your account</h1>
      <p className="mb-6 text-sm text-slate-500">
        Start tracking job profitability in minutes.
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
          <label htmlFor="name" className="mb-1 block text-sm font-medium text-slate-700">
            Your name
          </label>
          <input
            id="name"
            type="text"
            {...register("name")}
            className="w-full min-h-[44px] rounded-md border border-slate-300 px-3 py-2 text-base sm:text-sm text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            placeholder="Sam Lambert"
          />
          {errors.name && (
            <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="companyName" className="mb-1 block text-sm font-medium text-slate-700">
            Company name
          </label>
          <input
            id="companyName"
            type="text"
            {...register("companyName")}
            className="w-full min-h-[44px] rounded-md border border-slate-300 px-3 py-2 text-base sm:text-sm text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            placeholder="Lambert's Landscapes"
          />
          {errors.companyName && (
            <p className="mt-1 text-xs text-red-600">{errors.companyName.message}</p>
          )}
        </div>

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

        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
            Password
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
            Confirm password
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
          {isSubmitting ? "Creating account..." : "Create account"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-slate-900 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
