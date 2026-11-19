import type { ReactNode } from "react";
import { AgentRuntimeBoundary } from "./agent-runtime-boundary";

export default function AgentsLayout({ children }: { children: ReactNode }) {
  return <AgentRuntimeBoundary>{children}</AgentRuntimeBoundary>;
}
