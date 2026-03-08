"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";

const acceptSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type AcceptForm = z.infer<typeof acceptSchema>;

interface InviteInfo {
  email: string;
  role: string;
  company_name: string;
}

function AcceptInviteForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AcceptForm>({
    resolver: zodResolver(acceptSchema),
  });

  useEffect(() => {
    if (!token) {
      setError("No invite token provided");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    supabase
      .rpc("get_invite_by_token", { invite_token: token })
      .then(({ data, error: rpcError }) => {
        if (rpcError || !data || data.length === 0) {
          setError("Invalid or expired invite link");
        } else {
          setInvite(data[0] as InviteInfo);
        }
        setLoading(false);
      });
  }, [token]);

  const onSubmit = async (data: AcceptForm) => {
    if (!invite || !token) return;

    const supabase = createClient();

    // 1. Sign up the user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: invite.email,
      password: data.password,
    });

    if (authError) {
      setError(authError.message);
      return;
    }

    if (!authData.user) {
      setError("Signup failed");
      return;
    }

    // 2. Accept the invite (creates user profile)
    const { error: acceptError } = await supabase.rpc("handle_invite_accept", {
      invite_token: token,
      user_id: authData.user.id,
      user_name: data.name,
    });

    if (acceptError) {
      setError(acceptError.message);
      return;
    }

    setSuccess(true);
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm text-slate-500">Loading invite...</p>
      </div>
    );
  }

  if (error && !invite) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-2xl font-bold text-slate-900">Invalid invite</h1>
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-2xl font-bold text-slate-900">Welcome!</h1>
        <p className="text-sm text-slate-600">
          Your account has been created. Check your email to confirm, then{" "}
          <a href="/login" className="font-medium text-slate-900 hover:underline">
            sign in
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="mb-2 text-2xl font-bold text-slate-900">Join {invite?.company_name}</h1>
      <p className="mb-6 text-sm text-slate-500">
        You&apos;ve been invited as{" "}
        <span className="font-medium text-slate-700">
          {invite?.role.replace("_", " ")}
        </span>
        . Create your account to get started.
      </p>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <div className="mb-4 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700">
        Email: <span className="font-medium">{invite?.email}</span>
      </div>

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
          />
          {errors.name && (
            <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>
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
          className="w-full min-h-[48px] rounded-md bg-slate-900 px-4 py-2.5 text-base sm:text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {isSubmitting ? "Creating account..." : "Create account & join"}
        </button>
      </form>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense>
      <AcceptInviteForm />
    </Suspense>
  );
}
