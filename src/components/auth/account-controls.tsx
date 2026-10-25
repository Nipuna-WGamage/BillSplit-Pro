"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useGroups } from "@/components/groups/group-provider";
import { createClient } from "@/lib/supabase/client";

export function AccountControls() {
  const router = useRouter();
  const { userEmail, isSupabaseMode } = useGroups();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  async function handleSignOut() {
    setError("");
    setPending(true);

    try {
      const { error: signOutError } = await createClient().auth.signOut();

      if (signOutError) {
        setError(`Could not sign out. ${signOutError.message}`);
        return;
      }

      setIsMenuOpen(false);
      router.replace("/login");
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? `Could not sign out. ${caught.message}`
          : "Could not sign out. Try again.",
      );
    } finally {
      setPending(false);
    }
  }

  if (!isSupabaseMode || !userEmail) {
    return (
      <div className="account-controls">
        {!isSupabaseMode ? (
          <span className="account-mode-label">Demo Mode</span>
        ) : null}
        <Link className="account-link" href="/login">
          Sign In
        </Link>
        <Link className="account-link account-link-primary" href="/signup">
          Create Account
        </Link>
      </div>
    );
  }

  return (
    <div className="account-controls account-controls-signed-in">
      <button
        aria-controls={isMenuOpen ? "account-menu" : undefined}
        aria-expanded={isMenuOpen}
        aria-label={`Account menu for ${userEmail}`}
        className="account-avatar-button"
        onClick={() => {
          setError("");
          setIsMenuOpen((open) => !open);
        }}
        type="button"
      >
        <span aria-hidden="true" className="topbar-avatar">
          {userEmail.slice(0, 2).toLocaleUpperCase()}
        </span>
        <span className="account-trigger-email">{userEmail}</span>
      </button>
      {isMenuOpen ? (
        <div
          aria-label="Account menu"
          className="account-menu"
          id="account-menu"
          role="region"
        >
          <span className="account-email">{userEmail}</span>
          <button disabled={pending} onClick={handleSignOut} type="button">
            {pending ? "Signing out…" : "Sign Out"}
          </button>
          {error ? <span role="alert">{error}</span> : null}
        </div>
      ) : null}
    </div>
  );
}
