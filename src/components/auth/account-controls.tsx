"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useGroups } from "@/components/groups/group-provider";
import { createClient } from "@/lib/supabase/client";

export function AccountControls() {
  const router = useRouter();
  const { userEmail, isSupabaseMode } = useGroups();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  if (!isSupabaseMode || !userEmail) {
    return null;
  }

  async function handleSignOut() {
    setError("");
    setPending(true);
    const { error: signOutError } = await createClient().auth.signOut();

    if (signOutError) {
      setError(signOutError.message);
      setPending(false);
      return;
    }

    router.replace("/login");
  }

  return (
    <div className="account-controls">
      <span className="account-email">{userEmail}</span>
      <button disabled={pending} onClick={handleSignOut} type="button">
        {pending ? "Signing out…" : "Sign out"}
      </button>
      {error ? <span role="alert">{error}</span> : null}
    </div>
  );
}
