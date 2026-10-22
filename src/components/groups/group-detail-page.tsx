"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useGroups } from "./group-provider";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase() ?? "")
    .join("");
}

export function GroupDetailPage({ groupId }: { groupId: string }) {
  const { groups, addMember, removeMember } = useGroups();
  const group = groups.find((item) => item.id === groupId);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const groupName = group?.name ?? "";

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
          <p>This demo group may have been reset when the page was refreshed.</p>
          <Link className="primary-action" href="/groups">Go to groups</Link>
        </section>
      </main>
    );
  }

  function handleAddMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    const result = addMember(groupId, { name, email });

    if (!result.success) {
      setError(result.error);
      return;
    }

    setName("");
    setEmail("");
    setNotice(`${result.value.members.at(-1)?.name ?? "Member"} added to ${groupName}.`);
  }

  function handleRemoveMember(memberId: string, memberName: string) {
    setError("");
    setNotice("");
    const result = removeMember(groupId, memberId);

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
      </header>

      <div className="groups-content group-detail-content">
        <div className="demo-notice groups-demo-notice" role="note">
          <span className="demo-indicator" />
          <span><strong>Demo workspace</strong><span className="demo-separator">·</span>Changes are temporary and reset when you refresh.</span>
          <span className="demo-tag">PREVIEW</span>
        </div>

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
              <p>{group.description || "A demo group ready for shared expenses."}</p>
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
            <p className="member-intro">Manage the demo members who share this space.</p>
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
                <div><dt>Monthly demo spend</dt><dd>LKR {group.monthlySpend.toLocaleString("en-LK")}</dd></div>
              </dl>
            </section>

            <section aria-labelledby="add-member-title" className="group-detail-panel add-member-panel">
              <p className="panel-kicker">GROW YOUR GROUP</p>
              <h2 id="add-member-title">Add a member</h2>
              <p>Use sample details only. No invitation email will be sent.</p>
              <form className="member-form" onSubmit={handleAddMember}>
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
                <button className="primary-action member-submit" type="submit">
                  <span aria-hidden="true">+</span> Add demo member
                </button>
              </form>
            </section>
          </aside>
        </div>

        <footer className="page-footer groups-page-footer">
          <span>BillSplit Pro <span className="footer-dot">·</span> A clearer way to share.</span>
          <span>Demo workspace <span className="footer-dot">·</span> LKR</span>
        </footer>
      </div>
    </main>
  );
}
