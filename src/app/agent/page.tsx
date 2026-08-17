import type { Metadata } from "next";
import { SiteShell } from "@/components/sites/aihot-virxact-com-e007b012/shared/SiteShell";
import { AgentPage } from "@/components/sites/aihot-virxact-com-e007b012/agent-b0e97f64/AgentPage";

export const metadata: Metadata = {
  title: "Agent 接入 · 早筛情报站",
  description:"四条接入路径均为匿名只读、无需 API Key:Agent Skill、MCP、RSS、REST API v1。",};

export default function Agent() {
  return (
    <SiteShell>
      <AgentPage />
    </SiteShell>
  );
}
