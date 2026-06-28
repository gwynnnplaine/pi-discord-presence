import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import {
  type ActivityState,
  type ToolInput,
  initialActivityState,
  reduce,
  toActivity,
} from "./activity.ts";
import { renderCard } from "./render.ts";
import { type PresenceScheduler, createScheduler, systemClock } from "./scheduler.ts";
import { createXhayperTransport } from "./transport.ts";
import { type PresenceLink, createPresenceLink } from "./link.ts";
import { loadGlobalConfig, loadProjectConfig, resolveEnablement } from "./config.ts";
import {
  type DesiredPresence,
  type RuntimeToggle,
  type SessionContext,
  MIN_INTERVAL_MS,
  epochNow,
  modelName,
  projectNameFromCwd,
} from "./types.ts";

const shortModel = (model: unknown): string => {
  const obj = model && typeof model === "object" ? (model as Record<string, unknown>) : {};
  const raw =
    typeof obj.name === "string" ? obj.name : typeof obj.id === "string" ? obj.id : "model";
  return raw.split("/").pop() ?? raw;
};

const toolInput = (args: unknown): ToolInput => {
  const obj = args && typeof args === "object" ? (args as Record<string, unknown>) : {};
  return {
    path: typeof obj.path === "string" ? obj.path : undefined,
    command: typeof obj.command === "string" ? obj.command : undefined,
  };
};

export default function registerDiscordPresence(pi: ExtensionAPI): void {
  let state: ActivityState = initialActivityState();
  let session: SessionContext | undefined;
  let scheduler: PresenceScheduler | undefined;
  let link: PresenceLink | undefined;
  let runtimeToggle: RuntimeToggle;
  let active = false;

  const render = (): DesiredPresence =>
    session ? { kind: "card", card: renderCard(toActivity(state), session) } : { kind: "cleared" };

  const tick = (): void => {
    if (active && scheduler) scheduler.request(render());
  };

  const start = (ctx: ExtensionContext): void => {
    if (ctx.mode !== "tui") return; // TUI only (Q9)
    const global = loadGlobalConfig();
    const projectOverride = ctx.isProjectTrusted() ? loadProjectConfig(ctx.cwd) : undefined;
    if (!resolveEnablement({ global, projectOverride, runtimeToggle })) {
      active = false;
      return;
    }
    session = {
      project: projectNameFromCwd(ctx.cwd),
      model: modelName(shortModel(ctx.model)),
      startedAt: epochNow(),
    };
    const transport = createXhayperTransport();
    link = createPresenceLink({ transport, clientId: global.clientId });
    const boundLink = link;
    scheduler = createScheduler({
      clock: systemClock(),
      minIntervalMs: MIN_INTERVAL_MS,
      push: (desired) => boundLink.push(desired),
    });
    state = initialActivityState();
    active = true;
    tick(); // initial idle card → triggers the first connect attempt
  };

  const stop = async (): Promise<void> => {
    if (scheduler) {
      scheduler.stop();
      scheduler = undefined;
    }
    if (link) {
      await link.push({ kind: "cleared" }).catch(() => undefined);
      await link.disconnect();
      link = undefined;
    }
    active = false;
    session = undefined;
  };

  pi.on("session_start", async (_event, ctx) => {
    await stop();
    start(ctx);
  });
  pi.on("session_shutdown", async () => {
    await stop();
  });

  pi.on("tool_execution_start", async (event) => {
    state = reduce(state, {
      type: "tool_start",
      toolName: event.toolName,
      input: toolInput(event.args),
    });
    tick();
  });
  pi.on("tool_execution_end", async (event) => {
    state = reduce(state, { type: "tool_end", toolName: event.toolName });
    tick();
  });
  pi.on("turn_start", async () => {
    state = reduce(state, { type: "thinking" });
    tick();
  });
  pi.on("turn_end", async () => {
    state = reduce(state, { type: "turn_end" });
    tick();
  });
  pi.on("agent_end", async () => {
    state = reduce(state, { type: "agent_end" });
    tick();
  });
  pi.on("model_select", async (event) => {
    if (session) session = { ...session, model: modelName(shortModel(event.model)) };
    tick();
  });

  pi.registerCommand("presence", {
    description: "Toggle Discord rich presence: /presence on|off|status",
    handler: async (args, ctx) => {
      const arg = (args ?? "").trim().toLowerCase();
      if (arg === "on") {
        runtimeToggle = true;
        if (!active) start(ctx);
        else tick();
        ctx.ui.notify("Discord presence: on", "info");
      } else if (arg === "off") {
        runtimeToggle = false;
        await stop();
        ctx.ui.notify("Discord presence: off", "info");
      } else {
        ctx.ui.notify(`Discord presence: ${active ? "on" : "off"}`, "info");
      }
    },
  });
}
