"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

export async function signup(formData: FormData) {
  const supabase = await createClient();
  const headersList = await headers();
  const origin = headersList.get("origin") ?? "";

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const name = formData.get("name") as string;
  const companyName = formData.get("companyName") as string;

  // 1. Sign up the user with Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      data: {
        name,
        company_name: companyName,
      },
    },
  });

  if (authError) {
    redirect(`/signup?error=${encodeURIComponent(authError.message)}`);
  }

  if (!authData.user) {
    redirect("/signup?error=Signup+failed");
  }

  // 2. Create company (using service role would be ideal, but for now
  //    we use the user's session — RLS INSERT on companies needs a
  //    bypass for the first insert during signup)
  //    We'll use a database function instead.

  // For the signup flow, we call an RPC that creates the company + user
  // record in a single transaction, bypassing RLS via SECURITY DEFINER.
  const { error: setupError } = await supabase.rpc("handle_new_signup", {
    user_id: authData.user.id,
    user_name: name,
    user_email: email,
    company_name: companyName,
  });

  if (setupError) {
    redirect(`/signup?error=${encodeURIComponent(setupError.message)}`);
  }

  redirect("/signup?message=Check+your+email+to+confirm+your+account");
}

export async function login(formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function forgotPassword(formData: FormData) {
  const supabase = await createClient();
  const headersList = await headers();
  const origin = headersList.get("origin") ?? "";

  const { error } = await supabase.auth.resetPasswordForEmail(
    formData.get("email") as string,
    { redirectTo: `${origin}/reset-password` }
  );

  if (error) {
    redirect(`/forgot-password?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/forgot-password?message=Check+your+email+for+a+reset+link");
}

export async function resetPassword(formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({
    password: formData.get("password") as string,
  });

  if (error) {
    redirect(`/reset-password?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/login?message=Password+updated+successfully");
}
