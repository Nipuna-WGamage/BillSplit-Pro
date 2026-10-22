"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  requestPasswordReset,
  type AuthFormState,
} from "@/app/auth/actions";

const initialState: AuthFormState = {};

export function PasswordResetRequestForm() {
  const [state, formAction, pending] = useActionState(
    requestPasswordReset,
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
        <h1 id="auth-title">Reset your password</h1>
        <p className="auth-description">
          Enter your account email and we’ll send you a secure reset link.
        </p>

        {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}
        {state.message ? <p className="form-success" role="status">{state.message}</p> : null}

        <form action={formAction} className="auth-form">
          <label className="form-field">
            <span>Email address</span>
            <input autoComplete="email" name="email" required type="email" />
          </label>
          <button className="primary-action auth-submit" disabled={pending} type="submit">
            {pending ? "Sending…" : "Send reset link"}
          </button>
        </form>
        <p className="auth-switch">
          Remembered your password? <Link href="/login">Sign in</Link>
        </p>
      </section>
    </main>
  );
}
