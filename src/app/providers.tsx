"use client";

import type { ReactNode } from "react";
import { GroupProvider } from "@/components/groups/group-provider";

export function Providers({ children }: { children: ReactNode }) {
  return <GroupProvider>{children}</GroupProvider>;
}
