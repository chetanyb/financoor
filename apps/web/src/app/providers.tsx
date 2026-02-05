"use client";

import { SessionProvider } from "@/lib/session";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
