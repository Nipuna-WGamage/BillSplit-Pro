"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useGroups } from "./group-provider";

const categories = ["Household", "Trip", "Family", "Other"] as const;

export function GroupsPage() {
  const { groups, createGroup } = useGroups();
  const router = useRouter();
  const [name, setName] = useState("");
  const [category, setCategory] = useState<(typeof categories)[number]>("Household");
  const [location, setLocation] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const result = createGroup({ name, category, location });

    if (!result.success) {
      setError(result.error);
      return;
    }

    router.push(`/groups/${result.value.id}`);
  }

  return (
    <main className="groups-screen">
      <header className="groups-topbar">
        <Link aria-label="Return to dashboard" className="groups-brand" href="/">
          <span className="brand-mark" aria-hidden="true">
            <span /><span /><span /><span />
          </span>
          <span><strong>BillSplit</strong> <em>Pro</em></span>
        </Link>
        <Link className="groups-back-link" href="/">
          <span aria-hidden="true">←</span> Dashboard
        </Link>
      </header>

      <div className="groups-content">
        <div className="demo-notice groups-demo-notice" role="note">
          <span className="demo-indicator" />
          <span><strong>Demo workspace</strong><span className="demo-separator">·</span>Changes are temporary and reset when you refresh.</span>
          <span className="demo-tag">PREVIEW</span>
        </div>

        <section aria-labelledby="groups-title" className="groups-page-intro">
          <div>
            <p className="eyebrow">YOUR SHARED SPACES</p>
            <h1 id="groups-title">Groups &amp; members</h1>
            <p className="welcome-copy">Organize shared household costs and see who&apos;s part of each group.</p>
          </div>
          <div aria-label={`${groups.length} demo groups`} className="groups-count">
            <strong>{groups.length}</strong>
            <span>demo groups</span>
          </div>
        </section>

        <section aria-labelledby="your-groups-title" className="groups-list-section" id="your-groups">
          <div className="groups-section-heading">
            <div>
              <p className="panel-kicker">YOUR WORKSPACES</p>
              <h2 id="your-groups-title">All groups</h2>
            </div>
            <span className="groups-member-total">
              {groups.reduce((total, group) => total + group.members.length, 0)} members across groups
            </span>
          </div>
          <div className="groups-card-grid">
            {groups.map((group, index) => (
              <article className="managed-group-card" key={group.id}>
                <div className="managed-group-card-top">
                  <span className={`managed-group-icon managed-group-tone-${index % 3}`}>
                    <svg aria-hidden="true" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24">
                      <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-6v-7h-4v7H4a1 1 0 0 1-1-1z" />
                    </svg>
                  </span>
                  <span className="group-category-pill">{group.category}</span>
                </div>
                <h3>{group.name}</h3>
                <p className="managed-group-description">
                  {group.description || "A demo group ready for shared expenses."}
                </p>
                <div className="managed-group-meta">
                  <span>{group.location || "Location not set"}</span>
                  <span>{group.members.length} {group.members.length === 1 ? "member" : "members"}</span>
                </div>
                <Link className="managed-group-action" href={`/groups/${group.id}`}>
                  View group <span aria-hidden="true">→</span>
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="create-group-title" className="create-group-panel">
          <div className="create-group-heading">
            <span aria-hidden="true" className="create-group-plus">+</span>
            <div>
              <p className="panel-kicker">START SOMETHING TOGETHER</p>
              <h2 id="create-group-title">Create a group</h2>
              <p>Set up a demo group and add its members.</p>
            </div>
          </div>
          <form className="group-form" onSubmit={handleSubmit}>
            <label className="form-field">
              <span>Group name <span aria-hidden="true">*</span></span>
              <input
                autoComplete="off"
                maxLength={60}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Maple House"
                required
                value={name}
              />
            </label>
            <label className="form-field">
              <span>Group type</span>
              <select
                onChange={(event) => setCategory(event.target.value as (typeof categories)[number])}
                value={category}
              >
                {categories.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label className="form-field form-field-location">
              <span>Location or short note</span>
              <input
                maxLength={100}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="e.g. Colombo 05"
                value={location}
              />
            </label>
            {error ? <p className="form-error" role="alert">{error}</p> : null}
            <div className="group-form-footer">
              <p>Demo-only — this group is not saved to a database.</p>
              <button className="primary-action" type="submit">Create demo group</button>
            </div>
          </form>
        </section>
        <footer className="page-footer groups-page-footer">
          <span>BillSplit Pro <span className="footer-dot">·</span> A clearer way to share.</span>
          <span>Demo workspace <span className="footer-dot">·</span> LKR</span>
        </footer>
      </div>
    </main>
  );
}
