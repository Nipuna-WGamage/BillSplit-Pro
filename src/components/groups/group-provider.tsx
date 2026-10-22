"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import {
  createExpense as createDemoExpense,
  deleteExpense as deleteDemoExpense,
  expenseCategories,
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
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";

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
  isLoading: boolean;
  isSupabaseMode: boolean;
  persistenceError: string;
  userEmail: string;
  createGroup: (input: CreateGroupInput) => Promise<MutationResult<DemoGroup>>;
  addMember: (
    groupId: string,
    input: AddMemberInput,
  ) => Promise<MutationResult<DemoGroup>>;
  removeMember: (
    groupId: string,
    memberId: string,
  ) => Promise<MutationResult<DemoGroup>>;
  createExpense: (
    groupId: string,
    input: ExpenseInput,
  ) => Promise<MutationResult<DemoGroup>>;
  updateExpense: (
    groupId: string,
    expenseId: string,
    input: ExpenseInput,
  ) => Promise<MutationResult<DemoGroup>>;
  deleteExpense: (
    groupId: string,
    expenseId: string,
  ) => Promise<MutationResult<DemoGroup>>;
  createSettlement: (
    groupId: string,
    input: SettlementInput,
  ) => Promise<MutationResult<DemoGroup>>;
  deleteSettlement: (
    groupId: string,
    settlementId: string,
  ) => Promise<MutationResult<DemoGroup>>;
};

type MutationUpdate<T> = MutationResult<{
  groups: DemoGroup[];
  value: T;
}>;

const GroupContext = createContext<GroupContextValue | null>(null);

export function GroupProvider({ children }: { children: ReactNode }) {
  const isSupabaseMode = isSupabaseConfigured();
  const [groups, setGroups] = useState<DemoGroup[]>(
    isSupabaseMode ? [] : initialDemoGroups,
  );
  const [isLoading, setIsLoading] = useState(isSupabaseMode);
  const [persistenceError, setPersistenceError] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const groupsRef = useRef(groups);
  const userRef = useRef<User | null>(null);
  const workspaceReadyRef = useRef(!isSupabaseMode);
  const requestIdRef = useRef(0);
  const mutationQueueRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    if (!isSupabaseMode) {
      return;
    }

    let active = true;
    const supabase = createClient();

    async function loadWorkspace(user: User | null) {
      const requestId = ++requestIdRef.current;
      userRef.current = user;
      workspaceReadyRef.current = false;
      setUserEmail(user?.email ?? "");
      setPersistenceError("");

      if (!user) {
        groupsRef.current = [];
        setGroups([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const { data, error } = await supabase
        .from("user_workspaces")
        .select("groups")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!active || requestId !== requestIdRef.current) {
        return;
      }

      if (error) {
        setPersistenceError(`Could not load your workspace. ${error.message}`);
        setGroups([]);
        groupsRef.current = [];
      } else {
        const savedGroups = data?.groups;

        if (savedGroups !== undefined && !isDemoGroupArray(savedGroups)) {
          setPersistenceError(
            "Saved workspace data has an unexpected format. It was not loaded.",
          );
          setGroups([]);
          groupsRef.current = [];
        } else {
          const nextGroups = savedGroups ?? [];
          setGroups(nextGroups);
          groupsRef.current = nextGroups;
          workspaceReadyRef.current = true;
        }
      }

      setIsLoading(false);
    }

    let authEventSeen = false;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      authEventSeen = true;
      const nextUser = session?.user ?? null;
      if (userRef.current?.id !== nextUser?.id) {
        groupsRef.current = [];
        setGroups([]);
      }
      userRef.current = nextUser;
      workspaceReadyRef.current = false;
      window.setTimeout(() => {
        if (active) {
          void loadWorkspace(nextUser);
        }
      }, 0);
    });

    void supabase.auth.getUser().then(({ data, error }) => {
      if (!active || authEventSeen) {
        return;
      }

      if (error) {
        setPersistenceError(`Could not verify your session. ${error.message}`);
        setIsLoading(false);
        return;
      }

      void loadWorkspace(data.user);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [isSupabaseMode]);

  const value = useMemo<GroupContextValue>(() => {
    async function enqueueMutation<T>(
      buildUpdate: (current: DemoGroup[]) => MutationUpdate<T>,
    ): Promise<MutationResult<T>> {
      const operation = mutationQueueRef.current.then(async () => {
        if (isSupabaseMode && !workspaceReadyRef.current) {
          return {
            success: false as const,
            error: "Your workspace is still loading or could not be loaded. Refresh and try again.",
          };
        }

        const update = buildUpdate(groupsRef.current);

        if (!update.success) {
          return update;
        }

        if (isSupabaseMode) {
          const user = userRef.current;

          if (!user) {
            return {
              success: false as const,
              error: "Sign in before saving workspace changes.",
            };
          }

          const { error } = await createClient()
            .from("user_workspaces")
            .upsert(
              {
                user_id: user.id,
                groups: update.value.groups,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "user_id" },
            );

          if (error) {
            const message = `Could not save your changes. ${error.message}`;
            setPersistenceError(message);
            return { success: false as const, error: message };
          }
        }

        groupsRef.current = update.value.groups;
        setGroups(update.value.groups);
        setPersistenceError("");
        return { success: true as const, value: update.value.value };
      });

      mutationQueueRef.current = operation.then(
        () => undefined,
        () => undefined,
      );

      return operation;
    }

    return {
      groups,
      isLoading,
      isSupabaseMode,
      persistenceError,
      userEmail,
      createGroup(input) {
        return enqueueMutation((current) => {
          const result = createDemoGroup(input, current);

          if (!result.success) {
            return result;
          }

          const userEmail = userRef.current?.email;
          const savedGroup =
            isSupabaseMode && userEmail
              ? {
                  ...result.value,
                  members: result.value.members.map((member) =>
                    member.role === "Admin"
                      ? {
                          ...member,
                          name: userEmail.split("@")[0] || "Group admin",
                          email: userEmail,
                        }
                      : member,
                  ),
                }
              : result.value;

          return {
            success: true,
            value: {
              groups: [...current, savedGroup],
              value: savedGroup,
            },
          };
        });
      },
      addMember(groupId, input) {
        return enqueueMutation((current) => {
          const group = current.find((item) => item.id === groupId);

          if (!group) {
            return { success: false, error: "This group could not be found." };
          }

          const result = addDemoGroupMember(group, input);

          if (!result.success) {
            return result;
          }

          return {
            success: true,
            value: {
              groups: current.map((item) =>
                item.id === groupId ? result.value.group : item,
              ),
              value: result.value.group,
            },
          };
        });
      },
      removeMember(groupId, memberId) {
        return enqueueMutation((current) => {
          const group = current.find((item) => item.id === groupId);

          if (!group) {
            return { success: false, error: "This group could not be found." };
          }

          const result = removeDemoGroupMember(group, memberId);

          if (!result.success) {
            return result;
          }

          return {
            success: true,
            value: {
              groups: current.map((item) =>
                item.id === groupId ? result.value : item,
              ),
              value: result.value,
            },
          };
        });
      },
      createExpense(groupId, input) {
        return enqueueMutation((current) => {
          const group = current.find((item) => item.id === groupId);

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

          return {
            success: true,
            value: {
              groups: current.map((item) =>
                item.id === groupId ? updatedGroup : item,
              ),
              value: updatedGroup,
            },
          };
        });
      },
      updateExpense(groupId, expenseId, input) {
        return enqueueMutation((current) => {
          const group = current.find((item) => item.id === groupId);

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

          return {
            success: true,
            value: {
              groups: current.map((item) =>
                item.id === groupId ? updatedGroup : item,
              ),
              value: updatedGroup,
            },
          };
        });
      },
      deleteExpense(groupId, expenseId) {
        return enqueueMutation((current) => {
          const group = current.find((item) => item.id === groupId);

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

          return {
            success: true,
            value: {
              groups: current.map((item) =>
                item.id === groupId ? updatedGroup : item,
              ),
              value: updatedGroup,
            },
          };
        });
      },
      createSettlement(groupId, input) {
        return enqueueMutation((current) => {
          const group = current.find((item) => item.id === groupId);

          if (!group) {
            return { success: false, error: "This group could not be found." };
          }

          const currentBalances = calculateGroupBalances(
            group.members,
            group.expenses,
            group.settlements,
          );
          const result = createDemoSettlement(
            input,
            group.members,
            currentBalances,
          );

          if (!result.success) {
            return result;
          }

          const updatedGroup = {
            ...group,
            settlements: [...group.settlements, result.value],
          };

          return {
            success: true,
            value: {
              groups: current.map((item) =>
                item.id === groupId ? updatedGroup : item,
              ),
              value: updatedGroup,
            },
          };
        });
      },
      deleteSettlement(groupId, settlementId) {
        return enqueueMutation((current) => {
          const group = current.find((item) => item.id === groupId);

          if (!group) {
            return { success: false, error: "This group could not be found." };
          }

          const result = deleteDemoSettlement(
            settlementId,
            group.settlements,
          );

          if (!result.success) {
            return result;
          }

          const updatedGroup = { ...group, settlements: result.value };

          return {
            success: true,
            value: {
              groups: current.map((item) =>
                item.id === groupId ? updatedGroup : item,
              ),
              value: updatedGroup,
            },
          };
        });
      },
    };
  }, [groups, isLoading, isSupabaseMode, persistenceError, userEmail]);

  return <GroupContext.Provider value={value}>{children}</GroupContext.Provider>;
}

function isDemoGroupArray(value: unknown): value is DemoGroup[] {
  if (!Array.isArray(value)) {
    return false;
  }

  const groupIds = new Set<string>();

  return value.every((group) => {
    if (
      !isRecord(group) ||
      typeof group.id !== "string" ||
      groupIds.has(group.id) ||
      typeof group.name !== "string" ||
      !["Household", "Trip", "Family", "Other"].includes(
        typeof group.category === "string" ? group.category : "",
      ) ||
      typeof group.location !== "string" ||
      typeof group.description !== "string" ||
      !Array.isArray(group.members) ||
      !Array.isArray(group.expenses) ||
      !Array.isArray(group.settlements)
    ) {
      return false;
    }

    groupIds.add(group.id);
    const memberIds = new Set<string>();
    const membersAreValid = group.members.every((member) => {
      if (
        !isRecord(member) ||
        typeof member.id !== "string" ||
        memberIds.has(member.id) ||
        typeof member.name !== "string" ||
        typeof member.email !== "string" ||
        (member.role !== "Admin" && member.role !== "Member")
      ) {
        return false;
      }

      memberIds.add(member.id);
      return true;
    });

    return (
      membersAreValid &&
      group.expenses.every(
        (expense) =>
          isRecord(expense) &&
          typeof expense.id === "string" &&
          typeof expense.description === "string" &&
          typeof expense.category === "string" &&
          expenseCategories.some((category) => category === expense.category) &&
          typeof expense.amountMinor === "number" &&
          Number.isSafeInteger(expense.amountMinor) &&
          expense.amountMinor > 0 &&
          typeof expense.paidByMemberId === "string" &&
          memberIds.has(expense.paidByMemberId) &&
          typeof expense.date === "string" &&
          isValidIsoDate(expense.date) &&
          typeof expense.notes === "string" &&
          Array.isArray(expense.participantMemberIds) &&
          expense.participantMemberIds.length > 0 &&
          new Set(expense.participantMemberIds).size ===
            expense.participantMemberIds.length &&
          expense.participantMemberIds.every(
            (memberId) => typeof memberId === "string" && memberIds.has(memberId),
          ) &&
          typeof expense.settled === "boolean",
      ) &&
      group.settlements.every(
        (settlement) =>
          isRecord(settlement) &&
          typeof settlement.id === "string" &&
          typeof settlement.fromMemberId === "string" &&
          memberIds.has(settlement.fromMemberId) &&
          typeof settlement.toMemberId === "string" &&
          memberIds.has(settlement.toMemberId) &&
          settlement.fromMemberId !== settlement.toMemberId &&
          typeof settlement.amountMinor === "number" &&
          Number.isSafeInteger(settlement.amountMinor) &&
          settlement.amountMinor > 0 &&
          typeof settlement.date === "string" &&
          isValidIsoDate(settlement.date) &&
          typeof settlement.notes === "string",
      )
    );
  });
}

function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function useGroups(): GroupContextValue {
  const context = useContext(GroupContext);

  if (!context) {
    throw new Error("useGroups must be used inside a GroupProvider.");
  }

  return context;
}
