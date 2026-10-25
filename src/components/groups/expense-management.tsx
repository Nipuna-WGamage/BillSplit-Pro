"use client";

import { useState, type FormEvent } from "react";
import {
  expenseCategories,
  formatLkr,
  type ExpenseCategory,
  type ExpenseInput,
} from "@/lib/expenses";
import { splitExpenseEqually } from "@/lib/balances";
import { useGroups } from "./group-provider";

type ExpenseManagementProps = {
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

function emptyForm(memberId: string): ExpenseInput {
  return {
    description: "",
    category: "Groceries",
    amount: "",
    paidByMemberId: memberId,
    date: localToday(),
    notes: "",
    participantMemberIds: [],
  };
}

function formatExpenseDate(value: string): string {
  return new Date(`${value}T12:00:00`).toLocaleDateString("en-LK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function isExpenseCategory(value: string): value is ExpenseCategory {
  return expenseCategories.some((category) => category === value);
}

export function ExpenseManagement({ groupId }: ExpenseManagementProps) {
  const {
    groups,
    createExpense,
    updateExpense,
    deleteExpense,
    isSupabaseMode,
  } = useGroups();
  const group = groups.find((item) => item.id === groupId);
  const [form, setForm] = useState<ExpenseInput>(() =>
    emptyForm(group?.members[0]?.id ?? ""),
  );
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  if (!group) {
    return null;
  }

  const activeGroup = group;
  const sortedExpenses = [...activeGroup.expenses].sort((first, second) =>
    second.date.localeCompare(first.date),
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    const result = await (editingExpenseId
      ? updateExpense(groupId, editingExpenseId, form)
      : createExpense(groupId, form));

    if (!result.success) {
      setError(result.error);
      return;
    }

    setNotice(
      isSupabaseMode
        ? editingExpenseId
          ? "Expense changes saved to this group."
          : "Expense saved to this group."
        : editingExpenseId
          ? "Expense updated in this demo."
          : "Expense added to this demo.",
    );
    setEditingExpenseId(null);
    setPendingDeleteId(null);
    setForm(emptyForm(activeGroup.members[0]?.id ?? ""));
  }

  function handleEdit(expenseId: string) {
    const expense = activeGroup.expenses.find((item) => item.id === expenseId);

    if (!expense) {
      setError("This expense could not be found.");
      return;
    }

    setError("");
    setNotice("");
    setPendingDeleteId(null);
    setEditingExpenseId(expenseId);
    setForm({
      description: expense.description,
      category: expense.category,
      amount: (expense.amountMinor / 100).toFixed(2),
      paidByMemberId: expense.paidByMemberId,
      date: expense.date,
      notes: expense.notes,
      participantMemberIds: [...expense.participantMemberIds],
    });
    const formTitle = document.getElementById("expense-form-title");
    if (typeof formTitle?.scrollIntoView === "function") {
      formTitle.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  async function handleDelete(expenseId: string) {
    setError("");
    setNotice("");

    const result = await deleteExpense(groupId, expenseId);

    if (!result.success) {
      setError(result.error);
      setPendingDeleteId(null);
      return;
    }

    if (editingExpenseId === expenseId) {
      setEditingExpenseId(null);
      setForm(emptyForm(activeGroup.members[0]?.id ?? ""));
    }

    setPendingDeleteId(null);
    setNotice(
      isSupabaseMode
        ? "Expense removed from this saved group."
        : "Expense removed from this demo.",
    );
  }

  function cancelEdit() {
    setEditingExpenseId(null);
    setError("");
    setForm(emptyForm(activeGroup.members[0]?.id ?? ""));
  }

  function toggleParticipant(memberId: string) {
    setForm((current) => ({
      ...current,
      participantMemberIds: current.participantMemberIds.includes(memberId)
        ? current.participantMemberIds.filter((id) => id !== memberId)
        : [...current.participantMemberIds, memberId],
    }));
  }

  return (
    <section aria-labelledby="expense-history-title" className="expense-management-panel">
      <div className="expense-management-heading">
        <div>
          <p className="panel-kicker">SHARED COSTS</p>
          <h2 id="expense-history-title">Expenses <span className="member-count">{activeGroup.expenses.length}</span></h2>
          <p>
            {isSupabaseMode
              ? "Track who paid and who is included. Expenses are saved to this shared group."
              : "Track who paid and who is included. Expense changes stay in this demo only."}
          </p>
        </div>
        <span className="expense-currency-pill">LKR</span>
      </div>

      {error ? <p className="form-error expense-message" role="alert">{error}</p> : null}
      {notice ? <p className="form-success expense-message" role="status">{notice}</p> : null}

      {sortedExpenses.length === 0 ? (
        <div className="expense-empty">
          <span aria-hidden="true">▤</span>
          <strong>No expenses yet</strong>
          <p>
            {isSupabaseMode
              ? "Add your first shared cost below to start this group's history."
              : "Add your first shared cost below to start this demo&apos;s history."}
          </p>
        </div>
      ) : (
        <div className="expense-history">
          <div aria-hidden="true" className="expense-history-header">
            <span>EXPENSE</span>
            <span>PAID BY</span>
            <span>DATE</span>
            <span>AMOUNT</span>
            <span>ACTIONS</span>
          </div>
          {sortedExpenses.map((expense) => {
            const payer = activeGroup.members.find(
              (member) => member.id === expense.paidByMemberId,
            );
            const shares = splitExpenseEqually(
              expense.amountMinor,
              expense.participantMemberIds,
            );
            const deletePending = pendingDeleteId === expense.id;

            return (
              <div className="expense-history-row" key={expense.id}>
                <div className="expense-history-description">
                  <span className="expense-icon expense-icon-mint" aria-hidden="true">
                    <svg fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24">
                      <path d="M4 3h16v18l-4-2-4 2-4-2-4 2-4-2z" />
                      <path d="M8 8h8M8 12h8" />
                    </svg>
                  </span>
                  <span>
                    <strong>{expense.description}</strong>
                    <span>{expense.category}{expense.notes ? ` · ${expense.notes}` : ""}</span>
                    <span className="expense-participant-list">
                      Split with {expense.participantMemberIds
                        .map((memberId) => activeGroup.members.find((member) => member.id === memberId)?.name)
                        .filter(Boolean)
                        .join(", ")}
                    </span>
                    <details className="expense-split-details">
                      <summary>View equal split</summary>
                      <ul>
                        {shares.map((share) => (
                          <li key={share.memberId}>
                            <span>
                              {activeGroup.members.find((member) => member.id === share.memberId)?.name}
                            </span>
                            <strong>{formatLkr(share.amountMinor)}</strong>
                          </li>
                        ))}
                      </ul>
                    </details>
                  </span>
                </div>
                <span className="expense-history-payer">{payer?.name ?? "Group member"}</span>
                <time className="expense-history-date" dateTime={expense.date}>
                  {formatExpenseDate(expense.date)}
                </time>
                <strong className="expense-history-amount">{formatLkr(expense.amountMinor)}</strong>
                <div className="expense-row-actions">
                  {deletePending ? (
                    <span className="delete-confirmation" role="group" aria-label={`Confirm removing ${expense.description}`}>
                      <button
                        className="expense-action expense-action-danger"
                        onClick={() => handleDelete(expense.id)}
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
                    <>
                      <button
                        aria-label={`Edit ${expense.description}`}
                        className="expense-action"
                        onClick={() => handleEdit(expense.id)}
                        type="button"
                      >
                        Edit
                      </button>
                      <button
                        aria-label={`Delete ${expense.description}`}
                        className="expense-action expense-action-danger"
                        onClick={() => setPendingDeleteId(expense.id)}
                        type="button"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <form aria-labelledby="expense-form-title" className="expense-form" onSubmit={handleSubmit}>
        <div className="expense-form-heading">
          <h3 id="expense-form-title">{editingExpenseId ? "Edit expense" : "Add an expense"}</h3>
          <p>
            {isSupabaseMode
              ? "Changes are saved to this shared group."
              : "Only demo data is collected; no changes are saved to a database."}
          </p>
        </div>

        <div className="expense-form-grid">
          <label className="form-field expense-description-field">
            <span>Description <span aria-hidden="true">*</span></span>
            <input
              maxLength={100}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              placeholder="e.g. Monthly rent"
              required
              value={form.description}
            />
          </label>
          <label className="form-field">
            <span>Category <span aria-hidden="true">*</span></span>
            <select
              onChange={(event) => {
                const category = event.target.value;

                if (isExpenseCategory(category)) {
                  setForm({ ...form, category });
                } else {
                  setError("Choose a valid expense category.");
                }
              }}
              value={form.category}
              required
            >
              {expenseCategories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span>Amount (LKR) <span aria-hidden="true">*</span></span>
            <input
              aria-describedby="expense-amount-help"
              inputMode="decimal"
              onChange={(event) => setForm({ ...form, amount: event.target.value })}
              placeholder="0.00"
              required
              value={form.amount}
            />
            <span className="form-hint" id="expense-amount-help">Use up to two decimal places.</span>
          </label>
          <label className="form-field">
            <span>Paid by <span aria-hidden="true">*</span></span>
            <select
              onChange={(event) => setForm({ ...form, paidByMemberId: event.target.value })}
              required
              value={form.paidByMemberId}
            >
              {activeGroup.members.map((member) => (
                <option key={member.id} value={member.id}>{member.name}</option>
              ))}
            </select>
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
          <label className="form-field expense-notes-field">
            <span>Notes <span className="optional-label">(optional)</span></span>
            <textarea
              maxLength={500}
              onChange={(event) => setForm({ ...form, notes: event.target.value })}
              placeholder="Add a note for the group"
              rows={2}
              value={form.notes}
            />
          </label>
          <fieldset className="expense-participants">
            <legend>Who&apos;s included? <span aria-hidden="true">*</span></legend>
            <div className="participant-options">
              {activeGroup.members.map((member) => (
                <label className="participant-option" key={member.id}>
                  <input
                    checked={form.participantMemberIds.includes(member.id)}
                    onChange={() => toggleParticipant(member.id)}
                    type="checkbox"
                  />
                  <span>{member.name}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <div className="expense-form-footer">
          <p>Selected participants share the amount equally.</p>
          <div>
            {editingExpenseId ? (
              <button className="secondary-action" onClick={cancelEdit} type="button">
                Cancel edit
              </button>
            ) : null}
            <button className="primary-action" type="submit">
              {editingExpenseId
                ? "Save changes"
                : isSupabaseMode
                  ? "Save expense"
                  : "Add demo expense"}
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}
