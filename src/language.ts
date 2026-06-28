import type { AssetKey, FileName, LanguageIcon } from "./types.ts";
import { PI_LOGO } from "./types.ts";

// Starter set. Each assetKey must exist as an uploaded art asset in the Discord
// app, or it silently falls back to no small icon on Discord's side.
const ICONS: Readonly<Record<string, LanguageIcon>> = {
  ts: { label: "TypeScript", assetKey: "ts" as AssetKey },
  tsx: { label: "TypeScript React", assetKey: "ts" as AssetKey },
  js: { label: "JavaScript", assetKey: "js" as AssetKey },
  jsx: { label: "JavaScript React", assetKey: "js" as AssetKey },
  mjs: { label: "JavaScript", assetKey: "js" as AssetKey },
  cjs: { label: "JavaScript", assetKey: "js" as AssetKey },
  py: { label: "Python", assetKey: "python" as AssetKey },
  rs: { label: "Rust", assetKey: "rust" as AssetKey },
  go: { label: "Go", assetKey: "go" as AssetKey },
  json: { label: "JSON", assetKey: "json" as AssetKey },
  md: { label: "Markdown", assetKey: "markdown" as AssetKey },
  sh: { label: "Shell", assetKey: "shell" as AssetKey },
  bash: { label: "Shell", assetKey: "shell" as AssetKey },
  zsh: { label: "Shell", assetKey: "shell" as AssetKey },
  nu: { label: "Nushell", assetKey: "shell" as AssetKey },
  lua: { label: "Lua", assetKey: "lua" as AssetKey },
  toml: { label: "TOML", assetKey: "toml" as AssetKey },
  yaml: { label: "YAML", assetKey: "yaml" as AssetKey },
  yml: { label: "YAML", assetKey: "yaml" as AssetKey },
};

export const resolveLanguage = (file: FileName): LanguageIcon => {
  const dot = file.lastIndexOf(".");
  const ext = dot >= 0 ? file.slice(dot + 1).toLowerCase() : "";
  return ICONS[ext] ?? { label: ext ? ext.toUpperCase() : "File", assetKey: PI_LOGO };
};
