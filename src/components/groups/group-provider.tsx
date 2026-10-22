"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  createExpense as createDemoExpense,
  deleteExpense as deleteDemoExpense,
  updateExpense as updateDemoExpense,
  type ExpenseInput,
} from "@/lib/expenses";
import { calculateGroupBalances } from "@/lib/balances";
import {
  createSettlement as createDemoSettlement,
  deleteSettlement as deleteDemoSettlement,
  type SettlementInput,
} from "@/lib/settlements";
import {
  addDemoGroupMember,
  createDemoGroup,
  initialDemoGroups,
  removeDemoGroupMember,
  type DemoGroup,
  type GroupCategory,
  type MutationResult,
} from "@/lib/groups";

type CreateGroupInput = {
  name: string;
  category: GroupCategory;
  location: string;
};

type AddMemberInput = {
  name: string;
  email: string;
};

type GroupContextValue = {
  groups: DemoGroup[];
  createGroup: (input: CreateGroupInput) => MutationResult<DemoGroup>;
  addMember: (
    groupId: string,
    input: AddMemberInput,
  ) => MutationResult<DemoGroup>;
  removeMember: (
    groupId: string,
    memberId: string,
  ) => MutationResult<DemoGroup>;
  createExpense: (
    groupId: string,
    input: ExpenseInput,
  ) => MutationResult<DemoGroup>;
  updateExpense: (
    groupId: string,
    expenseId: string,
    input: ExpenseInput,
  ) => MutationResult<DemoGroup>;
  deleteExpense: (
    groupId: string,
    expenseId: string,
  ) => MutationResult<DemoGroup>;
  createSettlement: (
    groupId: string,
    input: SettlementInput,
  ) => MutationResult<DemoGroup>;
  deleteSettlement: (
    groupId: string,
    settlementId: string,
  ) => MutationResult<DemoGroup>;
};

const GroupContext = createContext<GroupContextValue | null>(null);

export function GroupProvider({ children }: { children: ReactNode }) {
  const [groups, setGroups] = useState(initialDemoGroups);

  const value = useMemo<GroupContextValue>(
    () => ({
      groups,
      createGroup(input) {
        const result = createDemoGroup(input, groups);

        if (result.success) {
          setGroups((current) => [...current, result.value]);
        }

        return result;
      },
      addMember(groupId, input) {
        const group = groups.find((item) => item.id === groupId);

        if (!group) {
          return { success: false, error: "This group could not be found." };
        }

        const result = addDemoGroupMember(group, input);

        if (result.success) {
          setGroups((current) =>
            current.map((item) =>
              item.id === groupId ? result.value.group : item,
            ),
          );
        }

        return result.success
          ? { success: true, value: result.value.group }
          : result;
      },
      removeMember(groupId, memberId) {
        const group = groups.find((item) => item.id === groupId);

        if (!group) {
          return { success: false, error: "This group could not be found." };
        }

        const result = removeDemoGroupMember(group, memberId);

        if (result.success) {
          setGroups((current) =>
            current.map((item) => (item.id === groupId ? result.value : item)),
          );
        }

        return result;
      },
      createExpense(groupId, input) {
        const group = groups.find((item) => item.id === groupId);

        if (!group) {
          return { success: false, error: "This group could not be found." };
        }

        const result = createDemoExpense(
          input,
          group.members.map((member) => member.id),
        );

        if (!result.success) {
          return result;
        }

        const updatedGroup = {
          ...group,
          expenses: [...group.expenses, result.value],
        };
        setGroups((current) =>
          current.map((item) => (item.id === groupId ? updatedGroup : item)),
        );

        return { success: true, value: updatedGroup };
      },
      updateExpense(groupId, expenseId, input) {
        const group = groups.find((item) => item.id === groupId);

        if (!group) {
          return { success: false, error: "This group could not be found." };
        }

        if (group.settlements.length > 0) {
          return {
            success: false,
            error: "Expenses cannot be edited after a settlement is recorded. Undo settlements first.",
          };
        }

        const result = updateDemoExpense(
          expenseId,
          input,
          group.members.map((member) => member.id),
          group.expenses,
        );

        if (!result.success) {
          return result;
        }

        const updatedGroup = {
          ...group,
          expenses: group.expenses.map((expense) =>
            expenseId === expense.id ? result.value : expense,
          ),
        };
        setGroups((current) =>
          current.map((item) => (item.id === groupId ? updatedGroup : item)),
        );

        return { success: true, value: updatedGroup };
      },
      deleteExpense(groupId, expenseId) {
        const group = groups.find((item) => item.id === groupId);

        if (!group) {
          return { success: false, error: "This group could not be found." };
        }

        if (group.settlements.length > 0) {
          return {
            success: false,
            error: "Expenses cannot be deleted after a settlement is recorded. Undo settlements first.",
          };
        }

        const result = deleteDemoExpense(expenseId, group.expenses);

        if (!result.success) {
          return result;
        }

        const updatedGroup = { ...group, expenses: result.value };
        setGroups((current) =>
          current.map((item) => (item.id === groupId ? updatedGroup : item)),
        );

        return { success: true, value: updatedGroup };
      },
      createSettlement(groupId, input) {
        const group = groups.find((item) => item.id === groupId);

        if (!group) {
          return { success: false, error: "This group could not be found." };
        }

        const currentBalances = calculateGroupBalances(
          group.members,
          group.expenses,
          group.settlements,
        );
        const result = createDemoSettlement(input, group.members, currentBalances);

        if (!result.success) {
          return result;
        }

        const updatedGroup = {
          ...group,
          settlements: [...group.settlements, result.value],
        };
        setGroups((current) =>
          current.map((item) => (item.id === groupId ? updatedGroup : item)),
        );

        return { success: true, value: updatedGroup };
      },
      deleteSettlement(groupId, settlementId) {
        const group = groups.find((item) => item.id === groupId);

        if (!group) {
          return { success: false, error: "This group could not be found." };
        }

        const result = deleteDemoSettlement(settlementId, group.settlements);

        if (!result.success) {
          return result;
        }

        const updatedGroup = { ...group, settlements: result.value };
        setGroups((current) =>
          current.map((item) => (item.id === groupId ? updatedGroup : item)),
        );

        return { success: true, value: updatedGroup };
      },
    }),
    [groups],
  );

  return <GroupContext.Provider value={value}>{children}</GroupContext.Provider>;
}

export function useGroups(): GroupContextValue {
  const context = useContext(GroupContext);

  if (!context) {
    throw new Error("useGroups must be used inside a GroupProvider.");
  }

  return context;
}
