"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { AccountControls } from "@/components/auth/account-controls";
import { useGroups } from "@/components/groups/group-provider";
import { calculateGroupBalances } from "@/lib/balances";
import { formatLkr } from "@/lib/expenses";

type IconName =
  | "activity"
  | "arrowDown"
  | "arrowRight"
  | "arrowUp"
  | "calendar"
  | "chevronDown"
  | "grid"
  | "home"
  | "plus"
  | "receipt"
  | "search"
  | "settings"
  | "users"
  | "wallet";

const icons: Record<IconName, ReactNode> = {
  activity: (
    <>
      <path d="M3 12h4l3-8 4 16 3-8h4" />
    </>
  ),
  arrowDown: (
    <>
      <path d="M12 5v14" />
      <path d="m19 12-7 7-7-7" />
    </>
  ),
  arrowRight: (
    <>
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </>
  ),
  arrowUp: (
    <>
      <path d="M12 19V5" />
      <path d="m5 12 7-7 7 7" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 11h18" />
    </>
  ),
  chevronDown: <path d="m7 10 5 5 5-5" />,
  grid: (
    <>
      <rect x="3" y="3" width="8" height="8" rx="2" />
      <rect x="13" y="3" width="8" height="5" rx="2" />
      <rect x="13" y="10" width="8" height="11" rx="2" />
      <rect x="3" y="13" width="8" height="8" rx="2" />
    </>
  ),
  home: (
    <>
      <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-6v-7h-4v7H4a1 1 0 0 1-1-1z" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  receipt: (
    <>
      <path d="M4 3h16v18l-4-2-4 2-4-2-4 2z" />
      <path d="M8 8h8M8 12h8" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a8 8 0 0 1-1.8 1l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.8-1l-1.7.7-1.4-2.4L7.1 15a8 8 0 0 1 0-2l-1.4-1.1 1.4-2.4 1.7.7a8 8 0 0 1 1.8-1l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.8 1l1.7-.7 1.4 2.4-1.4 1.1a8 8 0 0 1-.1 2z" />
    </>
  ),
  users: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="10" cy="7" r="4" />
      <path d="M20 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" />
    </>
  ),
  wallet: (
    <>
      <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H20v16H6a3 3 0 0 1-3-3V6a2 2 0 0 1 2-2" />
      <path d="M3 7h17v5h-4a2 2 0 0 0 0 4h4" />
      <path d="M16 14h.01" />
    </>
  ),
};

function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      {icons[name]}
    </svg>
  );
}

const navigation = [
  { label: "Overview", href: "#overview", icon: "grid" },
  { label: "Groups", href: "/groups", icon: "users" },
  { label: "Expenses", href: "#recent-activity", icon: "receipt" },
  { label: "Balances", href: "#balances", icon: "wallet" },
] as const;

function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <span />
      <span />
      <span />
      <span />
    </span>
  );
}

function NavigationLinks({
  mobile = false,
  balanceCount = 0,
}: {
  mobile?: boolean;
  balanceCount?: number;
}) {
  return (
    <nav
      aria-label={mobile ? "Mobile navigation" : "Main navigation"}
      className={mobile ? "mobile-nav" : "side-nav"}
    >
      {navigation.map((item, index) => (
        <Link
          aria-current={index === 0 ? "page" : undefined}
          className={`nav-link${index === 0 ? " nav-link-active" : ""}`}
          href={item.href}
          key={item.label}
        >
          <Icon className="nav-icon" name={item.icon} />
          <span>{item.label}</span>
          {item.label === "Balances" && !mobile ? (
            <span className="nav-count">{balanceCount}</span>
          ) : null}
        </Link>
      ))}
    </nav>
  );
}

function AvatarStack() {
  return (
    <div aria-label="Four household members" className="avatar-stack">
      <span className="avatar avatar-one">NP</span>
      <span className="avatar avatar-two">AB</span>
      <span className="avatar avatar-three">KS</span>
      <span className="avatar avatar-more">+1</span>
    </div>
  );
}

export default function Home() {
  const {
    groups,
    isLoading,
    isSupabaseMode,
    persistenceError,
    userEmail,
  } = useGroups();
  const allExpenses = groups.flatMap((group) =>
    group.expenses.map((expense) => ({
      ...expense,
      groupName: group.name,
      payerName:
        group.members.find((member) => member.id === expense.paidByMemberId)?.name ??
        "Group member",
    })),
  );
  const recentExpenses = [...allExpenses]
    .sort((first, second) => second.date.localeCompare(first.date))
    .slice(0, 3);
  const sharedSpendMinor = allExpenses.reduce(
    (total, expense) => total + expense.amountMinor,
    0,
  );
  const groupBalances = groups.map((group) => ({
    group,
    balances: calculateGroupBalances(
      group.members,
      group.expenses,
      group.settlements,
    ),
  }));
  const balanceRows = groupBalances.flatMap(({ group, balances }) =>
    balances.flatMap((balance) => {
      if (balance.balanceMinor === 0) {
        return [];
      }

      const member = group.members.find((item) => item.id === balance.memberId);

      return member
        ? [{ ...balance, memberName: member.name, groupName: group.name }]
        : [];
    }),
  );
  const currentUserBalanceMinor = groupBalances.reduce(
    (total, { group, balances }) => {
      const admin = group.members.find((member) => member.role === "Admin");

      if (!admin) {
        return total;
      }

      const adminBalance = balances.find((balance) => balance.memberId === admin.id);

      return total + (adminBalance?.balanceMinor ?? 0);
    },
    0,
  );
  const currentUserBalanceGroupCount = groupBalances.filter(
    ({ group, balances }) => {
      const admin = group.members.find((member) => member.role === "Admin");

      return admin
        ? balances.some(
            (balance) =>
              balance.memberId === admin.id && balance.balanceMinor !== 0,
          )
        : false;
    },
  ).length;
  const topBalances = [...balanceRows]
    .sort(
      (first, second) =>
        Math.abs(second.balanceMinor) - Math.abs(first.balanceMinor),
    )
    .slice(0, 2);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a aria-label="BillSplit Pro home" className="brand" href="#overview">
          <BrandMark />
          <span>
            <strong>BillSplit</strong>
            <span className="brand-light">Pro</span>
          </span>
        </a>

        <div className="workspace-switcher">
          <span className="workspace-avatar">M</span>
          <span className="workspace-copy">
            <span className="workspace-label">WORKSPACE</span>
            <strong>{groups[0]?.name ?? "Your workspace"}</strong>
          </span>
          <Icon className="workspace-chevron" name="chevronDown" />
        </div>

        <span className="nav-section-label">MENU</span>
        <NavigationLinks balanceCount={balanceRows.length} />

        <div className="sidebar-bottom">
          <a className="nav-link" href="#monthly-overview">
            <Icon className="nav-icon" name="activity" />
            <span>Monthly report</span>
          </a>
          <a className="nav-link" href="#settings">
            <Icon className="nav-icon" name="settings" />
            <span>Settings</span>
          </a>
          <div className="sidebar-divider" />
          <div className="profile">
            <span className="profile-avatar">
              {userEmail ? userEmail.slice(0, 2).toLocaleUpperCase() : "NP"}
            </span>
            <span className="profile-copy">
              <strong>{userEmail || "Nipun Perera"}</strong>
              <span>{isSupabaseMode ? "Account" : "Home admin"}</span>
            </span>
            <Icon className="workspace-chevron" name="chevronDown" />
          </div>
        </div>
      </aside>

      <main className="main-panel" id="overview">
        <header className="topbar">
          <div className="mobile-brand">
            <BrandMark />
            <span>
              <strong>BillSplit</strong>
              <span className="brand-light">Pro</span>
            </span>
          </div>
          <div className="topbar-context">
            <span className="breadcrumb-muted">Workspace</span>
            <span className="breadcrumb-divider">/</span>
            <span>Overview</span>
          </div>
          <div className="topbar-actions">
            <div className="search-box">
              <Icon className="search-icon" name="search" />
              <input aria-label="Search expenses" placeholder="Search anything..." />
              <kbd>⌘ K</kbd>
            </div>
            <button
              aria-label="Notifications"
              className="icon-button notification-button"
              type="button"
            >
              <span className="notification-dot" />
              <svg
                aria-hidden="true"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
                viewBox="0 0 24 24"
              >
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
              </svg>
            </button>
            <span className="topbar-avatar" title="Nipun Perera">
              {userEmail ? userEmail.slice(0, 2).toLocaleUpperCase() : "NP"}
            </span>
            <AccountControls />
          </div>
        </header>

        <div className="content">
          <div className="demo-notice" role="note">
            <span className="demo-indicator" />
            <span>
              <strong>{isSupabaseMode ? "Shared groups" : "Demo workspace"}</strong>
              <span className="demo-separator">·</span>
              {isSupabaseMode
                ? "Your groups and expenses are shared with their accepted members."
                : "Sample data only — nothing here is saved or real."}
            </span>
            <span className="demo-tag">{isSupabaseMode ? "SHARED" : "PREVIEW"}</span>
          </div>
          {persistenceError ? <p className="form-error" role="alert">{persistenceError}</p> : null}
          {isLoading ? <p className="form-success" role="status">Loading your groups…</p> : null}

          <section aria-labelledby="welcome-heading" className="welcome-row">
            <div>
              <p className="eyebrow">THURSDAY, OCTOBER 22, 2026</p>
              <h1 id="welcome-heading">Good afternoon, Nipun <span aria-hidden="true">✦</span></h1>
              <p className="welcome-copy">Here&apos;s what&apos;s happening with your shared expenses.</p>
            </div>
            <a className="period-select" href="#monthly-overview">
              <Icon className="period-icon" name="calendar" />
              <span>This month</span>
              <Icon className="period-chevron" name="chevronDown" />
            </a>
          </section>

          <section aria-label="Demo expense summary" className="summary-grid">
            <article className="summary-card summary-primary">
              <div className="summary-topline">
                <span className="summary-icon summary-icon-light">
                  <Icon name="wallet" />
                </span>
                <span className="summary-label">Your balance</span>
                <span className="balance-status">All groups</span>
              </div>
              <p className="summary-value">{formatLkr(Math.abs(currentUserBalanceMinor))}</p>
              <div className="summary-foot">
                <span className="balance-pill">
                  <Icon name={currentUserBalanceMinor < 0 ? "arrowDown" : "arrowUp"} />
                  {currentUserBalanceMinor > 0
                    ? "You are owed"
                    : currentUserBalanceMinor < 0
                      ? "You owe"
                      : "All settled"}
                </span>
                <span>across {currentUserBalanceGroupCount} groups</span>
              </div>
              <span aria-hidden="true" className="card-decoration card-decoration-one" />
              <span aria-hidden="true" className="card-decoration card-decoration-two" />
            </article>

            <article className="summary-card">
              <div className="summary-topline">
                <span className="summary-icon icon-teal">
                  <Icon name="receipt" />
                </span>
                <span className="summary-label">Total recorded expenses</span>
                <span className="summary-menu" aria-hidden="true">···</span>
              </div>
              <p className="summary-value summary-value-dark">{formatLkr(sharedSpendMinor)}</p>
              <div className="summary-foot">
                <span className="summary-subtle">
                  Across {isSupabaseMode ? "shared groups" : "demo groups"}
                </span>
                <span className="mini-bars" aria-hidden="true">
                  <i /><i /><i /><i /><i /><i /><i /><i /><i />
                </span>
              </div>
            </article>

            <article className="summary-card">
              <div className="summary-topline">
                <span className="summary-icon icon-lavender">
                  <Icon name="users" />
                </span>
                <span className="summary-label">Active groups</span>
                <span className="summary-menu" aria-hidden="true">···</span>
              </div>
              <p className="summary-value summary-value-dark">{groups.length} <span className="summary-unit">groups</span></p>
              <div className="summary-foot">
                <AvatarStack />
                <span className="summary-subtle">
                  {groups.reduce((total, group) => total + group.members.length, 0)} members total
                </span>
              </div>
            </article>
          </section>

          <section className="dashboard-grid">
            <article aria-labelledby="activity-heading" className="panel activity-panel" id="recent-activity">
              <div className="panel-heading">
                <div>
                  <p className="panel-kicker">YOUR HOUSEHOLD</p>
                  <h2 id="activity-heading">Recent activity</h2>
                </div>
                <a className="text-link" href="#your-groups">
                  View all <Icon name="arrowRight" />
                </a>
              </div>
              <div className="activity-table">
                <div aria-hidden="true" className="activity-header">
                  <span>EXPENSE</span>
                  <span>GROUP</span>
                  <span>AMOUNT</span>
                </div>
                {recentExpenses.map((expense) => (
                  <div className="activity-row" key={expense.id}>
                    <div className="expense-cell">
                      <span className={`expense-icon expense-icon-${expense.category === "Internet" ? "lavender" : expense.category === "Electricity" ? "peach" : "mint"}`}>
                        <Icon name="receipt" />
                      </span>
                      <span className="expense-copy">
                        <strong>{expense.description}</strong>
                        <span>{expense.payerName} <i>·</i> {expense.date}</span>
                      </span>
                    </div>
                    <span className="group-cell">{expense.groupName}</span>
                    <strong className="amount-cell">{formatLkr(expense.amountMinor)}</strong>
                  </div>
                ))}
              </div>
              <a className="activity-mobile-link" href="#your-groups">
                See all activity <Icon name="arrowRight" />
              </a>
            </article>

            <article aria-labelledby="balances-heading" className="panel balance-panel" id="balances">
              <div className="panel-heading">
                <div>
                  <p className="panel-kicker">AT A GLANCE</p>
                  <h2 id="balances-heading">Group balances</h2>
                </div>
                <button aria-label="Balance options" className="panel-menu" type="button">···</button>
              </div>
              {topBalances.length > 0 ? topBalances.map((balance, index) => (
                <div className="balance-person" key={`${balance.memberId}-${balance.groupName}`}>
                  <span className={`person-avatar person-avatar-${index === 0 ? "sage" : "rose"}`}>
                    {balance.memberName.split(/\s+/).map((part) => part[0]).slice(0, 2).join("")}
                  </span>
                  <span className="person-copy">
                    <strong>{balance.memberName}</strong>
                    <span>{balance.groupName}</span>
                  </span>
                  <span className={`person-balance ${balance.balanceMinor > 0 ? "positive" : "negative"}`}>
                    {balance.balanceMinor > 0 ? "+" : "−"} {formatLkr(Math.abs(balance.balanceMinor))}
                  </span>
                </div>
              )) : (
                <p className="balance-empty">Everyone is settled up in the demo groups.</p>
              )}
              <div className="balance-summary">
                <span className="balance-summary-icon">
                  <Icon name="activity" />
                </span>
                <span>
                  <strong>Keep things balanced</strong>
                  <span>Based on equal splits of demo expenses</span>
                </span>
              </div>
            </article>

            <article aria-labelledby="monthly-heading" className="panel monthly-panel" id="monthly-overview">
              <div className="panel-heading">
                <div>
                  <p className="panel-kicker">SPENDING SNAPSHOT</p>
                  <h2 id="monthly-heading">Monthly overview</h2>
                </div>
                <span className="chart-period">Last 6 months <Icon name="chevronDown" /></span>
              </div>
              <div
                aria-label="Demo monthly shared spending: May 28 thousand, June 35 thousand, July 31 thousand, August 42 thousand, September 37 thousand, October 49 thousand LKR"
                className="chart"
                role="img"
              >
                <div aria-hidden="true" className="chart-scale">
                  <span>50k</span><span>35k</span><span>20k</span><span>0</span>
                </div>
                <div aria-hidden="true" className="chart-bars">
                  <div className="chart-column"><span style={{ height: "48%" }} /><small>May</small></div>
                  <div className="chart-column"><span style={{ height: "61%" }} /><small>Jun</small></div>
                  <div className="chart-column"><span style={{ height: "54%" }} /><small>Jul</small></div>
                  <div className="chart-column"><span style={{ height: "73%" }} /><small>Aug</small></div>
                  <div className="chart-column"><span style={{ height: "66%" }} /><small>Sep</small></div>
                  <div className="chart-column chart-column-current"><span style={{ height: "86%" }} /><small>Oct</small></div>
                </div>
              </div>
            </article>

            <article aria-labelledby="groups-heading" className="panel groups-panel" id="your-groups">
              <div className="panel-heading">
                <div>
                  <p className="panel-kicker">YOUR SPACES</p>
                  <h2 id="groups-heading">Your groups</h2>
                </div>
                <Link aria-label="View all groups" className="panel-arrow" href="/groups">
                  <Icon name="arrowRight" />
                </Link>
              </div>
              <div className="group-list">
                {groups.map((group, index) => (
                  <Link className="group-row" href={`/groups/${group.id}`} key={group.id}>
                    <span className={`group-mark ${["group-green", "group-blue", "group-yellow"][index % 3]}`}>
                      <Icon name="home" />
                    </span>
                    <span className="group-copy">
                      <strong>{group.name}</strong>
                      <span>{group.members.length} {group.members.length === 1 ? "member" : "members"}</span>
                    </span>
                    <span className="group-amount">
                      <strong>
                        {formatLkr(
                          group.expenses.reduce(
                            (total, expense) => total + expense.amountMinor,
                            0,
                          ),
                        )}
                      </strong>
                      <span>this month</span>
                    </span>
                    <Icon className="group-chevron" name="arrowRight" />
                  </Link>
                ))}
              </div>
            </article>
          </section>

          <footer className="page-footer">
            <span>BillSplit Pro <span className="footer-dot">·</span> A clearer way to share.</span>
            <span>Demo workspace <span className="footer-dot">·</span> LKR</span>
          </footer>
        </div>
      </main>

      <NavigationLinks balanceCount={balanceRows.length} mobile />
    </div>
  );
}
