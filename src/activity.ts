import type { Activity } from "./types.ts";
import { bashHead, fileNameFromPath } from "./types.ts";
import { resolveLanguage } from "./language.ts";

export type ToolInput = { readonly path?: string; readonly command?: string };

export type AgentSignal =
  | { readonly type: "tool_start"; readonly toolName: string; readonly input: ToolInput }
  | { readonly type: "tool_end"; readonly toolName: string }
  | { readonly type: "thinking" } // turn_start / message_update
  | { readonly type: "turn_end" }
  | { readonly type: "agent_end" };

export interface ActivityState {
  readonly activeTools: ReadonlyArray<{ readonly toolName: string; readonly activity: Activity }>;
  readonly turnActive: boolean;
}

export const initialActivityState = (): ActivityState => ({ activeTools: [], turnActive: false });

const SEARCH_TOOLS = new Set([
  "grep",
  "glob",
  "find",
  "ffgrep",
  "fffind",
  "search",
  "code_pattern",
  "lsp_workspace_symbols",
]);
const BROWSE_TOOLS = new Set(["web_search", "fetch_content", "fetch", "browse", "get_search_content"]);

export const classifyTool = (toolName: string, input: ToolInput): Activity => {
  const n = toolName.toLowerCase();
  if ((n === "edit" || n === "write") && input.path) {
    const file = fileNameFromPath(input.path);
    return { kind: "editing", file, language: resolveLanguage(file) };
  }
  if (n === "read" && input.path) {
    const file = fileNameFromPath(input.path);
    return { kind: "reading", file, language: resolveLanguage(file) };
  }
  if (SEARCH_TOOLS.has(n)) return { kind: "searching" };
  if (BROWSE_TOOLS.has(n)) return { kind: "browsing" };
  if (n === "bash" && input.command) return { kind: "running", head: bashHead(input.command) };
  return { kind: "tool", toolName };
};

// Remove the last entry matching toolName (LIFO), preserving the rest.
const popLast = (
  tools: ActivityState["activeTools"],
  toolName: string,
): ActivityState["activeTools"] => {
  for (let i = tools.length - 1; i >= 0; i--) {
    if (tools[i]?.toolName === toolName) return [...tools.slice(0, i), ...tools.slice(i + 1)];
  }
  return tools;
};

export const reduce = (state: ActivityState, signal: AgentSignal): ActivityState => {
  switch (signal.type) {
    case "tool_start":
      return {
        activeTools: [
          ...state.activeTools,
          { toolName: signal.toolName, activity: classifyTool(signal.toolName, signal.input) },
        ],
        turnActive: true,
      };
    case "tool_end":
      return { ...state, activeTools: popLast(state.activeTools, signal.toolName) };
    case "thinking":
      return { ...state, turnActive: true };
    case "turn_end":
      // Between turns within the agent loop: drop stale tools, stay "thinking".
      return { activeTools: [], turnActive: true };
    case "agent_end":
      // Whole prompt finished → idle.
      return { activeTools: [], turnActive: false };
  }
};

// Most-recently-started active tool wins (OQ1); else thinking if a turn is live;
// else idle.
export const toActivity = (state: ActivityState): Activity => {
  const top = state.activeTools[state.activeTools.length - 1];
  if (top) return top.activity;
  if (state.turnActive) return { kind: "thinking" };
  return { kind: "idle" };
};
