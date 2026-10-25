"use client";

import { useState, type FormEvent } from "react";
import { calculateGroupBalances } from "@/lib/balances";
import { formatLkr } from "@/lib/expenses";
import type { SettlementInput } from "@/lib/settlements";
import { useGroups } from "./group-provider";

type SettlementManagementProps = {
  groupId: string;
};

function localToday(): string {
  const today = new Date();

  return [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");
}

function emptyForm(fromMemberId: string, toMemberId: string): SettlementInput {
  return {
    fromMemberId,
    toMemberId,
    amount: "",
    date: localToday(),
    notes: "",
  };
}

function settlementDate(value: string): string {
  return new Date(`${value}T12:00:00`).toLocaleDateString("en-LK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function SettlementManagement({ groupId }: SettlementManagementProps) {
  const {
    groups,
    createSettlement,
    deleteSettlement,
    isSupabaseMode,
  } = useGroups();
  const group = groups.find((item) => item.id === groupId);
  const balances = group
    ? calculateGroupBalances(group.members, group.expenses, group.settlements)
    : [];
  const owingMembers = group
    ? group.members.filter(
        (member) =>
          (balances.find((balance) => balance.memberId === member.id)
            ?.balanceMinor ?? 0) < 0,
      )
    : [];
  const owedMembers = group
    ? group.members.filter(
        (member) =>
          (balances.find((balance) => balance.memberId === member.id)
            ?.balanceMinor ?? 0) > 0,
      )
    : [];
  const [form, setForm] = useState<SettlementInput>(() =>
    emptyForm(owingMembers[0]?.id ?? "", owedMembers[0]?.id ?? ""),
  );
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  if (!group) {
    return null;
  }

  const recipientOptions = owedMembers.filter(
    (member) => member.id !== form.fromMemberId,
  );
  const fromBalance = balances.find(
    (balance) => balance.memberId === form.fromMemberId,
  )?.balanceMinor ?? 0;
  const toBalance = balances.find(
    (balance) => balance.memberId === form.toMemberId,
  )?.balanceMinor ?? 0;
  const maximumSettlement = Math.min(Math.abs(fromBalance), toBalance);
  const settlements = [...group.settlements].reverse();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    const result = await createSettlement(groupId, form);

    if (!result.success) {
      setError(result.error);
      return;
    }

    const nextBalances = calculateGroupBalances(
      result.value.members,
      result.value.expenses,
      result.value.settlements,
    );
    const nextOwing = result.value.members.find(
      (member) =>
        (nextBalances.find((balance) => balance.memberId === member.id)
          ?.balanceMinor ?? 0) < 0,
    );
    const nextOwed = result.value.members.find(
      (member) =>
        (nextBalances.find((balance) => balance.memberId === member.id)
          ?.balanceMinor ?? 0) > 0,
    );

    setForm(emptyForm(nextOwing?.id ?? "", nextOwed?.id ?? ""));
    setPendingDeleteId(null);
    setNotice(
      isSupabaseMode
        ? "Settlement saved and group balances updated."
        : "Settlement recorded in this demo.",
    );
  }

  async function handleDelete(settlementId: string) {
    setError("");
    setNotice("");
    const result = await deleteSettlement(groupId, settlementId);

    if (!result.success) {
      setError(result.error);
      setPendingDeleteId(null);
      return;
    }

    setPendingDeleteId(null);
    setNotice(
      isSupabaseMode
        ? "Settlement removed from the saved group; balances updated."
        : "Settlement removed from this demo and balances recalculated.",
    );
  }

  return (
    <section
      aria-labelledby="settlement-title"
      className="group-detail-panel settlement-panel"
    >
      <div className="groups-section-heading">
        <div>
          <p className="panel-kicker">RECORD A PAYMENT</p>
          <h2 id="settlement-title">Settlements</h2>
        </div>
        <span className="group-category-pill">
          {isSupabaseMode ? "SAVED" : "DEMO"}
        </span>
      </div>
      <p className="settlement-intro">
        {isSupabaseMode
          ? "Record money paid between members to update shared group balances. No money is transferred by this app."
          : "Record money paid between members to update outstanding balances. No money is transferred by this demo."}
      </p>

      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {notice ? <p className="form-success" role="status">{notice}</p> : null}

      <form className="settlement-form" onSubmit={handleSubmit}>
        <label className="form-field">
          <span>Paying member <span aria-hidden="true">*</span></span>
          <select
            onChange={(event) =>
              setForm({
                ...form,
                fromMemberId: event.target.value,
                toMemberId:
                  event.target.value === form.toMemberId
                    ? (owedMembers.find((member) => member.id !== event.target.value)?.id ?? "")
                    : form.toMemberId,
              })
            }
            required
            value={form.fromMemberId}
          >
            {owingMembers.map((member) => (
              <option key={member.id} value={member.id}>{member.name}</option>
            ))}
          </select>
        </label>
        <label className="form-field">
          <span>Receiving member <span aria-hidden="true">*</span></span>
          <select
            onChange={(event) =>
              setForm({ ...form, toMemberId: event.target.value })
            }
            required
            value={form.toMemberId}
          >
            {recipientOptions.map((member) => (
              <option key={member.id} value={member.id}>{member.name}</option>
            ))}
          </select>
        </label>
        <label className="form-field">
          <span>Amount (LKR) <span aria-hidden="true">*</span></span>
          <input
            inputMode="decimal"
            onChange={(event) => setForm({ ...form, amount: event.target.value })}
            placeholder="0.00"
            required
            value={form.amount}
          />
          <span className="form-hint">
            Up to {formatLkr(Math.max(0, maximumSettlement))} for this pair.
          </span>
        </label>
        <label className="form-field">
          <span>Date <span aria-hidden="true">*</span></span>
          <input
            max={localToday()}
            onChange={(event) => setForm({ ...form, date: event.target.value })}
            required
            type="date"
            value={form.date}
          />
        </label>
        <label className="form-field settlement-notes-field">
          <span>Notes <span className="optional-label">(optional)</span></span>
          <input
            maxLength={250}
            onChange={(event) => setForm({ ...form, notes: event.target.value })}
            placeholder="e.g. Cash repayment"
            value={form.notes}
          />
        </label>
        <button
          className="primary-action settlement-submit"
          disabled={owingMembers.length === 0 || recipientOptions.length === 0}
          type="submit"
        >
          {isSupabaseMode ? "Record settlement" : "Record demo settlement"}
        </button>
      </form>

      <div className="settlement-history">
        <h3>Payment history <span className="member-count">{settlements.length}</span></h3>
        {settlements.length === 0 ? (
          <p className="settlement-empty">
            {isSupabaseMode
              ? "No settlements recorded yet."
              : "No demo payments recorded yet."}
          </p>
        ) : (
          <ul className="settlement-list">
            {settlements.map((settlement) => {
              const payer = group.members.find(
                (member) => member.id === settlement.fromMemberId,
              );
              const recipient = group.members.find(
                (member) => member.id === settlement.toMemberId,
              );
              const isPending = pendingDeleteId === settlement.id;

              return (
                <li className="settlement-row" key={settlement.id}>
                  <span className="settlement-transfer">
                    <strong>{payer?.name ?? "Group member"}</strong>
                    <span>paid</span>
                    <strong>{recipient?.name ?? "Group member"}</strong>
                    {settlement.notes ? <span>· {settlement.notes}</span> : null}
                  </span>
                  <time dateTime={settlement.date}>{settlementDate(settlement.date)}</time>
                  <strong className="settlement-amount">
                    {formatLkr(settlement.amountMinor)}
                  </strong>
                  {isPending ? (
                    <span
                      aria-label="Confirm removing settlement"
                      className="settlement-actions"
                      role="group"
                    >
                      <button
                        className="expense-action expense-action-danger"
                        onClick={() => handleDelete(settlement.id)}
                        type="button"
                      >
                        Confirm
                      </button>
                      <button
                        className="expense-action"
                        onClick={() => setPendingDeleteId(null)}
                        type="button"
                      >
                        Cancel
                      </button>
                    </span>
                  ) : (
                    <button
                      aria-label={`Remove settlement of ${formatLkr(settlement.amountMinor)}`}
                      className="expense-action expense-action-danger"
                      onClick={() => setPendingDeleteId(settlement.id)}
                      type="button"
                    >
                      Undo
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
