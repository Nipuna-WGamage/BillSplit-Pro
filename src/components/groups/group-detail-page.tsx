"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { AccountControls } from "@/components/auth/account-controls";
import { calculateGroupBalances } from "@/lib/balances";
import { formatLkr } from "@/lib/expenses";
import { ExpenseManagement } from "./expense-management";
import { SettlementManagement } from "./settlement-management";
import { useGroups } from "./group-provider";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase() ?? "")
    .join("");
}

export function GroupDetailPage({ groupId }: { groupId: string }) {
  const {
    groups,
    addMember,
    removeMember,
    cancelInvitation,
    pendingInvitations,
    isLoading,
    isSupabaseMode,
    isGroupOwner,
    persistenceError,
    syncStatus,
  } = useGroups();
  const group = groups.find((item) => item.id === groupId);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [invitePending, setInvitePending] = useState(false);
  const groupName = group?.name ?? "";

  if (isLoading) {
    return <main className="groups-screen"><p role="status">Loading your groups…</p></main>;
  }

  if (!group) {
    return (
      <main className="groups-screen">
        <header className="groups-topbar">
          <Link aria-label="Return to dashboard" className="groups-brand" href="/">
            <span className="brand-mark" aria-hidden="true"><span /><span /><span /><span /></span>
            <span><strong>BillSplit</strong> <em>Pro</em></span>
          </Link>
          <Link className="groups-back-link" href="/groups">All groups</Link>
        </header>
        <section className="group-not-found">
          <span aria-hidden="true" className="group-not-found-icon">?</span>
          <h1>Group not found</h1>
          <p>{persistenceError || "This group is not available to your account."}</p>
          {persistenceError ? <p className="form-error" role="alert">{persistenceError}</p> : null}
          <Link className="primary-action" href="/groups">Go to groups</Link>
        </section>
      </main>
    );
  }

  const balances = calculateGroupBalances(
    group.members,
    group.expenses,
    group.settlements,
  );
  const canManageGroup = isGroupOwner(groupId);
  const groupInvitations = pendingInvitations.filter(
    (invitation) => invitation.groupId === groupId,
  );

  async function handleAddMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setInvitePending(true);

    try {
      const result = await addMember(groupId, { name, email });

      if (!result.success) {
        setError(result.error);
        return;
      }

      setName("");
      setEmail("");
      setNotice(
        isSupabaseMode
          ? `Sign-in invitation sent to ${email.trim().toLocaleLowerCase()}.`
          : `${result.value.members.at(-1)?.name ?? "Member"} added to ${groupName}.`,
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not send the group invitation.",
      );
    } finally {
      setInvitePending(false);
    }
  }

  async function handleCancelInvitation(invitationId: string) {
    setError("");
    setNotice("");

    try {
      const result = await cancelInvitation(invitationId);

      if (!result.success) {
        setError(result.error);
        return;
      }

      setNotice("Invitation cancelled.");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not cancel the group invitation.",
      );
    }
  }

  async function handleRemoveMember(memberId: string, memberName: string) {
    setError("");
    setNotice("");
    const result = await removeMember(groupId, memberId);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setNotice(`${memberName} removed from ${groupName}.`);
  }

  return (
    <main className="groups-screen">
      <header className="groups-topbar">
        <Link aria-label="Return to dashboard" className="groups-brand" href="/">
          <span className="brand-mark" aria-hidden="true"><span /><span /><span /><span /></span>
          <span><strong>BillSplit</strong> <em>Pro</em></span>
        </Link>
        <Link className="groups-back-link" href="/groups">
          <span aria-hidden="true">←</span> All groups
        </Link>
        <AccountControls />
      </header>

      <div className="groups-content group-detail-content">
        {isSupabaseMode ? (
          <>
            <div className="demo-notice groups-demo-notice" role="note">
              <span className="demo-indicator" />
              <span><strong>Shared group</strong><span className="demo-separator">·</span>Changes are saved for everyone in this group.</span>
              <span className="demo-tag">SHARED</span>
            </div>
            <p className={`sync-status sync-status-${syncStatus}`} role="status">
              {syncStatus === "connected"
                ? "Live group updates are on."
                : syncStatus === "error"
                  ? "Live updates unavailable. Refresh to check for changes."
                  : "Connecting to live group updates…"}
            </p>
          </>
        ) : (
          <div className="demo-notice groups-demo-notice" role="note">
            <span className="demo-indicator" />
            <span><strong>Demo workspace</strong><span className="demo-separator">·</span>Changes are temporary and reset when you refresh.</span>
            <span className="demo-tag">PREVIEW</span>
          </div>
        )}
        {persistenceError ? <p className="form-error" role="alert">{persistenceError}</p> : null}

        <nav aria-label="Breadcrumb" className="group-breadcrumb">
          <Link href="/">Overview</Link>
          <span aria-hidden="true">/</span>
          <Link href="/groups">Groups</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{group.name}</span>
        </nav>

        <section aria-labelledby="group-detail-title" className="group-detail-hero">
          <div className="group-detail-heading">
            <span className="group-detail-icon" aria-hidden="true">
              <svg fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24">
                <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-6v-7h-4v7H4a1 1 0 0 1-1-1z" />
              </svg>
            </span>
            <div>
              <span className="group-category-pill">{group.category}</span>
              <h1 id="group-detail-title">{group.name}</h1>
              <p>{group.description || "A group ready for shared expenses."}</p>
            </div>
          </div>
          <div className="group-detail-location">
            <span aria-hidden="true">⌖</span>
            <span>{group.location || "Location not set"}</span>
          </div>
        </section>

        <div className="group-detail-grid">
          <section aria-labelledby="members-title" className="group-detail-panel members-panel">
            <div className="groups-section-heading">
              <div>
                <p className="panel-kicker">PEOPLE IN THIS GROUP</p>
                <h2 id="members-title">Members <span className="member-count">{group.members.length}</span></h2>
              </div>
              <span className="group-category-pill">LKR</span>
            </div>
            <p className="member-intro">
              {isSupabaseMode
                ? "People with an accepted invitation can access this group's shared expenses."
                : "Manage the demo members who share this space."}
            </p>
            {error ? <p className="form-error" role="alert">{error}</p> : null}
            {notice ? <p className="form-success" role="status">{notice}</p> : null}
            <ul className="member-list">
              {group.members.map((member, index) => (
                <li className="member-row" key={member.id}>
                  <span className={`member-avatar member-avatar-${index % 4}`} aria-hidden="true">
                    {initials(member.name)}
                  </span>
                  <span className="member-info">
                    <strong>{member.name}</strong>
                    <span>{member.email}</span>
                  </span>
                  <span className={`member-role${member.role === "Admin" ? " member-role-admin" : ""}`}>
                    {member.role}
                  </span>
                  {member.role === "Admin" ? (
                    <span className="member-protected">Group admin</span>
                  ) : !canManageGroup ? (
                    <span className="member-protected">Group member</span>
                  ) : (
                    <button
                      aria-label={`Remove ${member.name} from ${group.name}`}
                      className="member-remove-button"
                      onClick={() => handleRemoveMember(member.id, member.name)}
                      type="button"
                    >
                      Remove
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <aside className="group-detail-aside">
            <section aria-labelledby="household-details-title" className="group-detail-panel household-panel">
              <p className="panel-kicker">GROUP INFORMATION</p>
              <h2 id="household-details-title">Household details</h2>
              <dl className="household-details-list">
                <div><dt>Group name</dt><dd>{group.name}</dd></div>
                <div><dt>Group type</dt><dd>{group.category}</dd></div>
                <div><dt>Location</dt><dd>{group.location || "Not set"}</dd></div>
                <div><dt>Currency</dt><dd>LKR <span>Sri Lankan Rupee</span></dd></div>
                <div>
                  <dt>{isSupabaseMode ? "Group expense total" : "Demo expense total"}</dt>
                  <dd>
                    LKR {(group.expenses.reduce((total, expense) => total + expense.amountMinor, 0) / 100)
                      .toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </dd>
                </div>
              </dl>
            </section>

            <section aria-labelledby="add-member-title" className="group-detail-panel add-member-panel">
              <p className="panel-kicker">GROW YOUR GROUP</p>
              <h2 id="add-member-title">{isSupabaseMode ? "Invite by email" : "Add a member"}</h2>
              <p>
                {isSupabaseMode
                  ? canManageGroup
                    ? "We will email a secure sign-in link. The invitee must use that address to join."
                    : "Only the group owner can invite people."
                  : "Use sample details only. No invitation email will be sent."}
              </p>
              {isSupabaseMode && groupInvitations.length > 0 ? (
                <div aria-label="Pending invitations" className="pending-invitations">
                  <h3>Pending invitations</h3>
                  <ul>
                    {groupInvitations.map((invitation) => (
                      <li key={invitation.id}>
                        <span>
                          <strong>{invitation.displayName}</strong>
                          <span>{invitation.email}</span>
                        </span>
                        {canManageGroup ? (
                          <button
                            className="member-remove-button"
                            onClick={() => handleCancelInvitation(invitation.id)}
                            type="button"
                          >
                            Cancel
                          </button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {canManageGroup ? <form className="member-form" onSubmit={handleAddMember}>
                <label className="form-field">
                  <span>Full name <span aria-hidden="true">*</span></span>
                  <input
                    autoComplete="off"
                    maxLength={80}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="e.g. Sam Fernando"
                    required
                    value={name}
                  />
                </label>
                <label className="form-field">
                  <span>Email address <span aria-hidden="true">*</span></span>
                  <input
                    autoComplete="off"
                    maxLength={254}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="sam@example.test"
                    required
                    type="email"
                    value={email}
                  />
                </label>
                <button className="primary-action member-submit" disabled={invitePending} type="submit">
                  <span aria-hidden="true">+</span>{" "}
                  {invitePending
                    ? "Sending invitation…"
                    : isSupabaseMode
                      ? "Send invitation"
                      : "Add demo member"}
                </button>
              </form> : null}
            </section>
          </aside>
        </div>

        <section aria-labelledby="group-balances-title" className="group-detail-panel group-balances-panel">
          <div className="groups-section-heading">
            <div>
              <p className="panel-kicker">EQUAL SPLIT SUMMARY</p>
              <h2 id="group-balances-title">Member balances</h2>
            </div>
            <span className="group-category-pill">LKR</span>
          </div>
          <p className="group-balances-intro">
            Based on each member&apos;s share of unsettled expenses. Remainder cents are assigned consistently.
          </p>
          <ul className="group-balance-list">
            {group.members.map((member) => {
              const balanceMinor = balances.find(
                (balance) => balance.memberId === member.id,
              )?.balanceMinor ?? 0;

              return (
                <li className="group-balance-row" key={member.id}>
                  <span className="group-balance-member">{member.name}</span>
                  <span className={`group-balance-amount ${
                    balanceMinor > 0
                      ? "group-balance-positive"
                      : balanceMinor < 0
                        ? "group-balance-negative"
                        : "group-balance-even"
                  }`}>
                    {balanceMinor > 0
                      ? `Owed ${formatLkr(balanceMinor)}`
                      : balanceMinor < 0
                        ? `Owes ${formatLkr(Math.abs(balanceMinor))}`
                        : "Settled up"}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        <SettlementManagement groupId={group.id} />
        <ExpenseManagement groupId={group.id} />

        <footer className="page-footer groups-page-footer">
          <span>BillSplit Pro <span className="footer-dot">·</span> A clearer way to share.</span>
          <span>Demo workspace <span className="footer-dot">·</span> LKR</span>
        </footer>
      </div>
    </main>
  );
}
