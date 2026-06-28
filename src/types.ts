import { basename } from "node:path";

// ── Branded primitives — constructed only via the smart constructors below ────
declare const brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [brand]: B };

export type DiscordClientId = Brand<string, "DiscordClientId">;
export type FileName = Brand<string, "FileName">; // basename only
export type ProjectName = Brand<string, "ProjectName">; // cwd basename
export type ModelName = Brand<string, "ModelName">; // short display name
export type BashHead = Brand<string, "BashHead">; // first command token, no args
export type AssetKey = Brand<string, "AssetKey">; // Discord art-asset key
export type EpochMillis = Brand<number, "EpochMillis">;

export interface LanguageIcon {
  readonly label: string;
  readonly assetKey: AssetKey;
}

// ── Activity: the closed set of things the agent can be doing ─────────────────
export type Activity =
  | { readonly kind: "editing"; readonly file: FileName; readonly language: LanguageIcon }
  | { readonly kind: "reading"; readonly file: FileName; readonly language: LanguageIcon }
  | { readonly kind: "searching" }
  | { readonly kind: "browsing" }
  | { readonly kind: "running"; readonly head: BashHead }
  | { readonly kind: "tool"; readonly toolName: string }
  | { readonly kind: "thinking" }
  | { readonly kind: "idle" };

// ── Session-stable context (project · model · session start) ──────────────────
export interface SessionContext {
  readonly project: ProjectName;
  readonly model: ModelName;
  readonly startedAt: EpochMillis; // stable; drives the continuous elapsed timer
}

// ── Card + wire payload ───────────────────────────────────────────────────────
export interface PresenceCard {
  readonly details: string; // activity line
  readonly state: string; // "project · model"
  readonly largeImage: AssetKey;
  readonly largeText: string;
  readonly smallImage: AssetKey;
  readonly smallText: string;
  readonly startTimestamp: EpochMillis;
}

export type DesiredPresence =
  | { readonly kind: "card"; readonly card: PresenceCard }
  | { readonly kind: "cleared" };

export interface SetActivityPayload {
  readonly details: string;
  readonly state: string;
  readonly startTimestamp: number;
  readonly largeImageKey: string;
  readonly largeImageText: string;
  readonly smallImageKey: string;
  readonly smallImageText: string;
  readonly instance: false;
}

// ── Config ────────────────────────────────────────────────────────────────────
export interface GlobalConfig {
  readonly enabled: boolean;
  readonly clientId: DiscordClientId;
}
export interface ProjectConfig {
  readonly enabled?: boolean;
}
export type RuntimeToggle = boolean | undefined; // /presence on|off, session-only

// ── Error channels (precise unions, errors-as-values) ─────────────────────────
export type ConnectError =
  | { readonly type: "DiscordNotRunning" } // socket absent — expected, silent
  | { readonly type: "HandshakeFailed"; readonly detail: string }
  | { readonly type: "InvalidClientId" };
export type TransportError =
  | { readonly type: "SocketClosed" }
  | { readonly type: "SetActivityFailed"; readonly detail: string };
export type ConfigError = { readonly type: "ConfigInvalid"; readonly issues: readonly string[] };

// ── Constants ─────────────────────────────────────────────────────────────────
export const PI_LOGO = "pi_logo" as AssetKey;
export const GENERIC_ICON = "pi_logo" as AssetKey; // reuse logo to minimize required uploads
export const MIN_INTERVAL_MS = 15_000;

// ── Smart constructors: the only place raw strings/numbers earn a brand ───────
export const fileNameFromPath = (path: string): FileName => (basename(path) || path) as FileName;

export const projectNameFromCwd = (cwd: string): ProjectName => (basename(cwd) || cwd) as ProjectName;

export const modelName = (name: string): ModelName => name as ModelName;

export const epochNow = (): EpochMillis => Date.now() as EpochMillis;

export const bashHead = (command: string): BashHead => {
  const tokens = command.trim().split(/\s+/);
  // Skip leading FOO=bar env assignments.
  const first = tokens.find((t) => !/^[A-Za-z_][A-Za-z0-9_]*=/.test(t)) ?? tokens[0] ?? "";
  return (basename(first) || first) as BashHead;
};
