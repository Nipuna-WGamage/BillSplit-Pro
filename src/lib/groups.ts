export type GroupCategory = "Household" | "Trip" | "Family" | "Other";

export type GroupMember = {
  id: string;
  name: string;
  email: string;
  role: "Admin" | "Member";
};

export type DemoGroup = {
  id: string;
  name: string;
  category: GroupCategory;
  location: string;
  description: string;
  monthlySpend: number;
  members: GroupMember[];
};

export type MutationResult<T> =
  | { success: true; value: T }
  | { success: false; error: string };

export const initialDemoGroups: DemoGroup[] = [
  {
    id: "maple-house",
    name: "Maple House",
    category: "Household",
    location: "Colombo 05",
    description: "Shared home expenses for the people under one roof.",
    monthlySpend: 12640,
    members: [
      { id: "nipun-perera", name: "Nipun Perera", email: "nipun@example.test", role: "Admin" },
      { id: "nimal-perera", name: "Nimal Perera", email: "nimal@example.test", role: "Member" },
      { id: "amaya-bandara", name: "Amaya Bandara", email: "amaya@example.test", role: "Member" },
      { id: "kavi-silva", name: "Kavi Silva", email: "kavi@example.test", role: "Member" },
    ],
  },
  {
    id: "beach-weekend",
    name: "Beach Weekend",
    category: "Trip",
    location: "Galle",
    description: "A shared pot for our next weekend away.",
    monthlySpend: 8250,
    members: [
      { id: "nipun-beach", name: "Nipun Perera", email: "nipun@example.test", role: "Admin" },
      { id: "amaya-beach", name: "Amaya Bandara", email: "amaya@example.test", role: "Member" },
      { id: "nimal-beach", name: "Nimal Perera", email: "nimal@example.test", role: "Member" },
      { id: "kavi-beach", name: "Kavi Silva", email: "kavi@example.test", role: "Member" },
      { id: "sachini-beach", name: "Sachini Fernando", email: "sachini@example.test", role: "Member" },
    ],
  },
  {
    id: "family",
    name: "Family",
    category: "Family",
    location: "Kandy",
    description: "Everyday shared costs with family.",
    monthlySpend: 2100,
    members: [
      { id: "nipun-family", name: "Nipun Perera", email: "nipun@example.test", role: "Admin" },
      { id: "amma-perera", name: "Amma Perera", email: "amma@example.test", role: "Member" },
      { id: "tharindu-perera", name: "Tharindu Perera", email: "tharindu@example.test", role: "Member" },
    ],
  },
];

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function uniqueId(base: string, existingIds: string[]): string {
  let candidate = base || "group";
  let suffix = 2;

  while (existingIds.includes(candidate)) {
    candidate = `${base || "group"}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

export function createDemoGroup(
  input: { name: string; category: GroupCategory; location: string },
  existingGroups: DemoGroup[],
): MutationResult<DemoGroup> {
  const name = input.name.trim();

  if (!name) {
    return { success: false, error: "Enter a name for this group." };
  }

  if (existingGroups.some((group) => group.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
    return { success: false, error: "A group with this name already exists." };
  }

  const id = uniqueId(
    slugify(name),
    existingGroups.map((group) => group.id),
  );

  return {
    success: true,
    value: {
      id,
      name,
      category: input.category,
      location: input.location.trim(),
      description: "",
      monthlySpend: 0,
      members: [
        {
          id: `member-${id}-admin`,
          name: "Nipun Perera",
          email: "nipun@example.test",
          role: "Admin",
        },
      ],
    },
  };
}

export function addDemoGroupMember(
  group: DemoGroup,
  input: { name: string; email: string },
): MutationResult<{ group: DemoGroup; member: GroupMember }> {
  const name = input.name.trim();
  const email = input.email.trim().toLocaleLowerCase();

  if (!name) {
    return { success: false, error: "Enter the member's name." };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: "Enter a valid email address." };
  }

  if (group.members.some((member) => member.email.toLocaleLowerCase() === email)) {
    return { success: false, error: "This email is already a member of the group." };
  }

  const memberId = slugify(email) || "member";
  const member: GroupMember = {
    id: uniqueId(
      memberId,
      group.members.map((current) => current.id),
    ),
    name,
    email,
    role: "Member",
  };

  return {
    success: true,
    value: {
      group: { ...group, members: [...group.members, member] },
      member,
    },
  };
}

export function removeDemoGroupMember(
  group: DemoGroup,
  memberId: string,
): MutationResult<DemoGroup> {
  const member = group.members.find((item) => item.id === memberId);

  if (!member) {
    return { success: false, error: "That member is no longer in this group." };
  }

  if (member.role === "Admin") {
    return { success: false, error: "The group admin cannot be removed." };
  }

  return {
    success: true,
    value: {
      ...group,
      members: group.members.filter((item) => item.id !== memberId),
    },
  };
}
