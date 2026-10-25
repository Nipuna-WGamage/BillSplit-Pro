"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn, signUp, type AuthFormState } from "@/app/auth/actions";

type AuthFormProps = {
  mode: "login" | "signup";
  isSupabaseConfigured: boolean;
};

const initialState: AuthFormState = {};

export function AuthForm({ mode, isSupabaseConfigured }: AuthFormProps) {
  const action = mode === "login" ? signIn : signUp;
  const [state, formAction, pending] = useActionState(action, initialState);
  const isSignup = mode === "signup";

  return (
    <main className="auth-screen">
      <section aria-labelledby="auth-title" className="auth-card">
        <Link className="auth-brand" href="/">
          <span className="brand-mark" aria-hidden="true">
            <span /><span /><span /><span />
          </span>
          <span><strong>BillSplit</strong> <em>Pro</em></span>
        </Link>
        <p className="panel-kicker">{isSignup ? "CREATE YOUR ACCOUNT" : "WELCOME BACK"}</p>
        <h1 id="auth-title">{isSignup ? "Create an account" : "Sign in"}</h1>
        <p className="auth-description">
          {isSignup
            ? "Groups you create are yours to share with invited members."
            : "Sign in to access your saved groups and expenses."}
        </p>

        {!isSupabaseConfigured ? (
          <p className="form-error" role="alert">
            Authentication is unavailable because Supabase is not configured.
            Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
            to enable sign-in and account creation.
          </p>
        ) : null}
        {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}
        {state.message ? <p className="form-success" role="status">{state.message}</p> : null}

        <form action={formAction} className="auth-form">
          <label className="form-field">
            <span>Email address</span>
            <input autoComplete="email" name="email" required type="email" />
          </label>
          <label className="form-field">
            <span>Password</span>
            <input
              autoComplete={isSignup ? "new-password" : "current-password"}
              minLength={isSignup ? 8 : undefined}
              name="password"
              required
              type="password"
            />
          </label>
          <button
            className="primary-action auth-submit"
            disabled={pending || !isSupabaseConfigured}
            type="submit"
          >
            {pending
              ? "Please wait…"
              : isSignup
                ? "Create account"
                : "Sign in"}
          </button>
        </form>
        {!isSignup ? (
          <p className="auth-switch">
            <Link href="/forgot-password">Forgot your password?</Link>
          </p>
        ) : null}
        <p className="auth-switch">
          {isSignup ? "Already have an account?" : "New to BillSplit Pro?"}{" "}
          <Link href={isSignup ? "/login" : "/signup"}>
            {isSignup ? "Sign in" : "Create an account"}
          </Link>
        </p>
      </section>
    </main>
  );
}
