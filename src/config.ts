import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  ConfigError,
  DiscordClientId,
  GlobalConfig,
  ProjectConfig,
  RuntimeToggle,
} from "./types.ts";
import { err, ok, type Result } from "./result.ts";

// Repo-shipped default "PI" application client id. Public value, kept in
// defaults.json (data, not source). Empty when absent → connection is a silent
// no-op, same as Discord being unavailable.
const FALLBACK_CLIENT_ID = "" as DiscordClientId;

const loadDefaultClientId = (): DiscordClientId => {
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    const raw = JSON.parse(readFileSync(join(here, "..", "defaults.json"), "utf8")) as unknown;
    const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    return typeof obj.clientId === "string" && obj.clientId.length > 0
      ? (obj.clientId as DiscordClientId)
      : FALLBACK_CLIENT_ID;
  } catch {
    return FALLBACK_CLIENT_ID;
  }
};

const DEFAULT_CLIENT_ID = loadDefaultClientId();

export const globalConfigPath = (): string => join(homedir(), ".pi", "agent", "discord-presence.json");
export const projectConfigPath = (cwd: string): string => join(cwd, ".pi", "discord-presence.json");

const readJson = (path: string): unknown => {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as unknown;
  } catch {
    return undefined;
  }
};

const asRecord = (raw: unknown): Record<string, unknown> =>
  raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};

export const parseGlobalConfig = (raw: unknown): Result<GlobalConfig, ConfigError> => {
  const obj = asRecord(raw);
  const issues: string[] = [];
  if (obj.enabled !== undefined && typeof obj.enabled !== "boolean") issues.push("enabled must be a boolean");
  if (obj.clientId !== undefined && typeof obj.clientId !== "string") issues.push("clientId must be a string");
  if (issues.length > 0) return err({ type: "ConfigInvalid", issues });
  const enabled = typeof obj.enabled === "boolean" ? obj.enabled : true;
  const clientId = (typeof obj.clientId === "string" ? obj.clientId : DEFAULT_CLIENT_ID) as DiscordClientId;
  return ok({ enabled, clientId });
};

export const parseProjectConfig = (raw: unknown): Result<ProjectConfig, ConfigError> => {
  const obj = asRecord(raw);
  if (obj.enabled !== undefined && typeof obj.enabled !== "boolean") {
    return err({ type: "ConfigInvalid", issues: ["enabled must be a boolean"] });
  }
  return ok(typeof obj.enabled === "boolean" ? { enabled: obj.enabled } : {});
};

// Boundary loaders: read file, parse, apply env override (env > file > default).
export const loadGlobalConfig = (): GlobalConfig => {
  const parsed = parseGlobalConfig(readJson(globalConfigPath()) ?? {});
  const base: GlobalConfig = parsed.ok ? parsed.value : { enabled: true, clientId: DEFAULT_CLIENT_ID };
  const envId = process.env.PI_DISCORD_CLIENT_ID;
  return envId ? { ...base, clientId: envId as DiscordClientId } : base;
};

export const loadProjectConfig = (cwd: string): ProjectConfig | undefined => {
  const raw = readJson(projectConfigPath(cwd));
  if (raw === undefined) return undefined;
  const parsed = parseProjectConfig(raw);
  return parsed.ok ? parsed.value : undefined;
};

// Precedence: runtime toggle > project override > global.
export const resolveEnablement = (args: {
  readonly global: GlobalConfig;
  readonly projectOverride: ProjectConfig | undefined;
  readonly runtimeToggle: RuntimeToggle;
}): boolean => {
  if (typeof args.runtimeToggle === "boolean") return args.runtimeToggle;
  if (args.projectOverride && typeof args.projectOverride.enabled === "boolean") {
    return args.projectOverride.enabled;
  }
  return args.global.enabled;
};
