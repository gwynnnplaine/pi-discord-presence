<div align="center">

<img src="https://raw.githubusercontent.com/gwynnnplaine/pi-discord-presence/main/assets/banner.png" alt="@gwynnnplaine/pi-discord-presence" width="100%">

[![License](https://img.shields.io/badge/license-MIT-111111?style=flat-square)](./LICENSE)
[![Pi extension](https://img.shields.io/badge/pi-extension-111111?style=flat-square)](https://pi.dev)
[![npm](https://img.shields.io/npm/v/@gwynnnplaine/pi-discord-presence?style=flat-square&color=111111&logo=npm)](https://www.npmjs.com/package/@gwynnnplaine/pi-discord-presence)
[![GitHub](https://img.shields.io/badge/github-gwynnnplaine%2Fpi--discord--presence-111111?style=flat-square&logo=github)](https://github.com/gwynnnplaine/pi-discord-presence)

</div>

> **Discord Rich Presence for Pi.** It shows what Pi is doing on your behalf,
> live.

`Editing foo.tsx` · `Running: git` · `Searching the codebase` · `Thinking…` ·
`Idle in dotfiles` — with the project, the model, and a session-elapsed timer.

```
┌───────────────────────┐
│ [▣]  Playing PI        │   ← Discord app name
│ [ts]  Editing foo.tsx  │   ← live agent activity
│       dotfiles · sonnet│   ← project · model
│       ⏱ 12:34           │   ← session elapsed
└───────────────────────┘
```

## Install

```bash
pi install npm:@gwynnnplaine/pi-discord-presence
# or
pi install git:github.com/gwynnnplaine/pi-discord-presence
# or, to try without installing:
pi -e /absolute/path/to/pi-discord-presence
```

The presence mirrors **what the agent is doing**:

| Pi activity                    | Shows as                  |
| ------------------------------ | ------------------------- |
| `edit` / `write` a file        | `Editing foo.tsx`         |
| `read` a file                  | `Reading foo.tsx`         |
| `grep` / `glob` / search       | `Searching the codebase`  |
| `web_search` / `fetch`         | `Browsing the web`        |
| `bash`                         | `Running: <first token>`  |
| any other tool                 | `Running <toolName>`      |
| generating a response          | `Thinking…`               |
| waiting for you                | `Idle in <project>`       |

The second line is `project · model`. The large image is the PI logo; the small
badge is the file's language icon.

## Discord app

Works out of the box against a default **Pi** application. To use your own name
and art, see [docs/discord-app.md](docs/discord-app.md).

## Config

Global `~/.pi/agent/discord-presence.json`:

```json
{ "enabled": true, "clientId": "1520833162148712580" }
```

Per-project `<repo>/.pi/discord-presence.json` (honored only when the project is
trusted) — silence a sensitive repo:

```json
{ "enabled": false }
```

Runtime: `/presence on`, `/presence off`, `/presence status`
(session-only). Precedence: **runtime > project > global**.

## Behavior

- **Active only in interactive TUI mode** (not `-p` / json one-shot runs).
- **Rate limit**: Discord caps presence at ~1 update / 15s. Updates are
  coalesced to the latest state with a trailing flush.
- **Privacy**: on by default; filenames + project name are broadcast. Disable
  globally, per-project, or at runtime. No filename ever leaks from `bash` args
  (only the first token is shown).
- **Multiple Pi sessions** share one Discord slot — last writer wins.

## Develop

```bash
npm install
npm run check   # tsc --noEmit
```

```
index.ts            re-exports the entry
src/result.ts       Result / ok / err
src/types.ts        branded types, Activity union, configs, errors, constructors
src/language.ts     extension → language-icon map
src/activity.ts     event reducer (reduce / toActivity / classifyTool)
src/render.ts       Activity → PresenceCard → wire payload
src/config.ts       parse + load config, resolveEnablement
src/scheduler.ts    Clock + coalesce/trailing-flush rate limiter
src/transport.ts    DiscordTransport seam + @xhayper adapter
src/link.ts         connection state machine + lazy reconnect
src/extension.ts    wires Pi events → reducer → scheduler
```

## License

MIT
