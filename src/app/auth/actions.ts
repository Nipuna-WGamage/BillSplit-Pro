"use server";

import { redirect } from "next/navigation";
import { getSiteUrl, isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export type AuthFormState = {
  error?: string;
  message?: string;
};

function credentials(formData: FormData): {
  email: string;
  password: string;
} | null {
  const email = formData.get("email");
  const password = formData.get("password");

  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    !email.trim() ||
    !password
  ) {
    return null;
  }

  return { email: email.trim().toLocaleLowerCase(), password };
}

export async function signIn(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  if (!isSupabaseConfigured()) {
    return { error: "Supabase is not configured. Add the required environment variables first." };
  }

  const input = credentials(formData);

  if (!input) {
    return { error: "Enter your email address and password." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(input);

  if (error) {
    return { error: error.message };
  }

  redirect("/");
}

export async function signUp(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  if (!isSupabaseConfigured()) {
    return { error: "Supabase is not configured. Add the required environment variables first." };
  }

  const input = credentials(formData);

  if (!input) {
    return { error: "Enter your email address and password." };
  }

  if (input.password.length < 8) {
    return { error: "Use a password with at least 8 characters." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    ...input,
    options: {
      emailRedirectTo: new URL("/auth/callback?next=%2F", getSiteUrl()).toString(),
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (!data.session) {
    return {
      message: "Check your email to confirm your account, then sign in.",
    };
  }

  redirect("/");
}

export async function signOut(): Promise<void> {
  if (!isSupabaseConfigured()) {
    redirect("/");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(`Could not sign out: ${error.message}`);
  }

  redirect("/login");
}
