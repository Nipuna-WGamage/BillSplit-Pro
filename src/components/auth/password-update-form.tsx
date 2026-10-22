"use client";

import Link from "next/link";
import { useActionState } from "react";
import { updatePassword, type AuthFormState } from "@/app/auth/actions";

const initialState: AuthFormState = {};

export function PasswordUpdateForm() {
  const [state, formAction, pending] = useActionState(
    updatePassword,
    initialState,
  );

  return (
    <main className="auth-screen">
      <section aria-labelledby="auth-title" className="auth-card">
        <Link className="auth-brand" href="/">
          <span className="brand-mark" aria-hidden="true">
            <span /><span /><span /><span />
          </span>
          <span><strong>BillSplit</strong> <em>Pro</em></span>
        </Link>
        <p className="panel-kicker">ACCOUNT RECOVERY</p>
        <h1 id="auth-title">Choose a new password</h1>
        <p className="auth-description">
          Use at least 8 characters for your new password.
        </p>

        {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}

        <form action={formAction} className="auth-form">
          <label className="form-field">
            <span>New password</span>
            <input
              autoComplete="new-password"
              minLength={8}
              name="password"
              required
              type="password"
            />
          </label>
          <label className="form-field">
            <span>Confirm new password</span>
            <input
              autoComplete="new-password"
              minLength={8}
              name="confirmPassword"
              required
              type="password"
            />
          </label>
          <button className="primary-action auth-submit" disabled={pending} type="submit">
            {pending ? "Updating…" : "Update password"}
          </button>
        </form>
        <p className="auth-switch">
          <Link href="/forgot-password">Request another reset link</Link>
        </p>
      </section>
    </main>
  );
}
