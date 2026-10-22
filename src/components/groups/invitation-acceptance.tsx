"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  acceptGroupInvitation,
  type AcceptInvitationState,
} from "@/app/groups/actions";

const initialState: AcceptInvitationState = {};

export function InvitationAcceptance({
  invitationId,
}: {
  invitationId: string;
}) {
  const [state, formAction, pending] = useActionState(
    acceptGroupInvitation,
    initialState,
  );

  return (
    <main className="auth-screen">
      <section aria-labelledby="invitation-title" className="auth-card">
        <Link className="auth-brand" href="/">
          <span className="brand-mark" aria-hidden="true">
            <span /><span /><span /><span />
          </span>
          <span><strong>BillSplit</strong> <em>Pro</em></span>
        </Link>
        <p className="panel-kicker">GROUP INVITATION</p>
        <h1 id="invitation-title">Join this group</h1>
        <p className="auth-description">
          Accept the invitation to view the group and collaborate on its shared
          expenses. Make sure you signed in with the invited email address.
        </p>
        {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}
        <form action={formAction}>
          <input name="invitationId" type="hidden" value={invitationId} />
          <button
            className="primary-action auth-submit"
            disabled={pending}
            type="submit"
          >
            {pending ? "Accepting invitation…" : "Accept invitation"}
          </button>
        </form>
      </section>
    </main>
  );
}
