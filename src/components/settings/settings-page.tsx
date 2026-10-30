"use client";

import Link from "next/link";
import { AccountControls } from "@/components/auth/account-controls";
import { useGroups } from "@/components/groups/group-provider";

export function SettingsPage() {
  const { isSupabaseMode, userEmail } = useGroups();
  const isSignedIn = isSupabaseMode && Boolean(userEmail);
  const accountName = userEmail
    ? userEmail.split("@")[0].replace(/[._-]+/g, " ")
    : isSupabaseMode
      ? "Not signed in"
      : "Demo account";
  const accountDescription = isSignedIn
    ? "Your groups and expenses are saved to your account and shared only with accepted group members."
    : isSupabaseMode
      ? "Sign in or create an account to access your saved groups and expenses."
      : "Demo changes are temporary. Sign in or create an account to save and share your groups.";

  return (
    <main className="settings-screen">
      <header className="groups-topbar">
        <Link aria-label="BillSplit Pro home" className="groups-brand" href="/">
          <span aria-hidden="true" className="brand-mark">
            <span /><span /><span /><span />
          </span>
          <span><strong>BillSplit</strong> <em>Pro</em></span>
        </Link>
        <Link className="groups-back-link" href="/">
          <span aria-hidden="true">←</span> Dashboard
        </Link>
        <AccountControls />
      </header>

      <div className="settings-content">
        <div className="settings-heading">
          <p className="eyebrow">PREFERENCES &amp; ACCOUNT</p>
          <h1>Settings</h1>
          <p>Manage your account and see how BillSplit Pro is configured.</p>
        </div>

        <section aria-labelledby="account-settings-title" className="settings-panel">
          <div className="settings-panel-heading">
            <span aria-hidden="true" className="settings-panel-icon">01</span>
            <div>
              <p className="panel-kicker">YOUR PROFILE</p>
              <h2 id="account-settings-title">Account</h2>
            </div>
          </div>
          <div className="settings-account-summary">
            <span aria-hidden="true" className="settings-avatar">
              {userEmail ? userEmail.slice(0, 2).toLocaleUpperCase() : "D"}
            </span>
            <div className="settings-account-copy">
              <strong>{accountName}</strong>
              <span>{userEmail || "No account is signed in"}</span>
            </div>
            <span className={`settings-status${isSignedIn ? " settings-status-active" : ""}`}>
              {isSignedIn ? "Connected" : isSupabaseMode ? "Signed out" : "Demo mode"}
            </span>
          </div>
          <p className="settings-description">
            {accountDescription}
          </p>
          {!isSignedIn ? (
            <div className="settings-actions">
              <Link className="primary-action" href="/login">Sign in</Link>
              <Link className="settings-secondary-action" href="/signup">Create account</Link>
            </div>
          ) : null}
        </section>

        <section aria-labelledby="preferences-title" className="settings-panel">
          <div className="settings-panel-heading">
            <span aria-hidden="true" className="settings-panel-icon">02</span>
            <div>
              <p className="panel-kicker">APP PREFERENCES</p>
              <h2 id="preferences-title">Currency &amp; calculations</h2>
            </div>
          </div>
          <div className="settings-detail-row">
            <div>
              <strong>Default currency</strong>
              <span>Used to display shared expenses and balances.</span>
            </div>
            <span className="settings-value">LKR <span>Sri Lankan Rupee</span></span>
          </div>
          <div className="settings-detail-row">
            <div>
              <strong>Expense split</strong>
              <span>Each expense is shared equally among selected members.</span>
            </div>
            <span className="settings-value">Equal split</span>
          </div>
          <p className="settings-note">
            Currency and split behavior are currently fixed for this workspace.
          </p>
        </section>

        <section aria-labelledby="security-title" className="settings-panel">
          <div className="settings-panel-heading">
            <span aria-hidden="true" className="settings-panel-icon">03</span>
            <div>
              <p className="panel-kicker">SECURITY &amp; SHARING</p>
              <h2 id="security-title">Access</h2>
            </div>
          </div>
          <div className="settings-detail-row">
            <div>
              <strong>Group access</strong>
              <span>Only accepted members can view a shared group.</span>
            </div>
            <Link className="settings-inline-link" href="/groups">Manage groups <span aria-hidden="true">→</span></Link>
          </div>
          {isSignedIn ? (
            <div className="settings-detail-row">
              <div>
                <strong>Password</strong>
                <span>Request a password reset for your account.</span>
              </div>
              <Link className="settings-inline-link" href="/forgot-password">Reset password <span aria-hidden="true">→</span></Link>
            </div>
          ) : (
            <div className="settings-detail-row">
              <div>
                <strong>Sign-in protection</strong>
                <span>Password and account security are available after sign-in.</span>
              </div>
              <Link className="settings-inline-link" href="/login">Sign in <span aria-hidden="true">→</span></Link>
            </div>
          )}
        </section>

        <footer className="settings-footer">
          <span>BillSplit Pro <span aria-hidden="true">·</span> A clearer way to share.</span>
          <span>{isSupabaseMode ? "Shared workspace" : "Demo workspace"} <span aria-hidden="true">·</span> LKR</span>
        </footer>
      </div>
    </main>
  );
}
