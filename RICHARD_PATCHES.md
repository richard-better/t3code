# RICHARD_PATCHES.md

This fork repurposes the t3code coding-agent engine for **knowledge work**: one
running instance binds to **one git repo** ("a person") — a PARA-style personal
knowledge base of markdown, not a codebase. This file is the contract for any
later agent that pulls upstream.

## Doctrine

1. **Upstream is read-only.** Treat every file that exists in upstream t3code as
   immutable. Our code lives in **overlay directories** of new files:
   - `apps/server/src/person/` — server-side overlay
   - `apps/desktop/src/person/` — desktop-side overlay
   - `apps/web/src/person/` — web-side overlay
2. **Touch upstream only at named seams.** When an overlay must hook into
   upstream, do it at the smallest possible seam (ideally one import + one line)
   and **record it in the decision log below** — what changed, which file, why,
   and how to re-apply if upstream moves it.
3. **Disable by not wiring, never by deleting.** To turn an upstream feature off
   (e.g. the multi-project selector), stop mounting/calling it. Leave the
   component in place.
4. **Inert when off.** Every seam must be a no-op when single-instance mode is
   not engaged (`T3PERSON_HOME` unset), so the fork still behaves like upstream.
5. **Reuse, don't duplicate.** Prefer calling existing upstream logic with
   overridden inputs over reimplementing it (per AGENTS.md maintainability rule).

## Single-instance mechanism

Single-instance mode is engaged by setting **`T3PERSON_HOME`** (env, or
`--person-home <dir>` argv) to the person's repo directory.

Verified architecture (do not re-derive):

- `ServerConfig` is **not** built in desktop `main.ts`. In desktop mode the
  Electron process spawns the server as a **child process**
  (`DesktopBackendManager` → `DesktopBackendConfiguration.ts`), passing
  `t3Home` (→ env `T3CODE_HOME`) in a bootstrap envelope. The actual
  `ServerConfig` service is provided **inside the server process** at
  `apps/server/src/cli/server.ts` (`runServerCommand` → `resolveServerConfig` in
  `apps/server/src/cli/config.ts`).
- `baseDir` drives everything: `deriveServerPaths` (`config.ts`) derives
  `state.sqlite` (threads DB), `caches/`, `worktrees/`, logs from it. Both
  `deriveServerPaths` and `ensureServerDirectories` are already exported, so the
  overlay needs **no edit to `config.ts`**.
- `cwd` is the provider session working directory; defaults to `process.cwd()`.
- The desktop backend child inherits `process.env` (the env field in
  `DesktopBackendConfiguration` is a *patch* that only unsets specific keys), so
  `T3PERSON_HOME` set in the Electron process **propagates** to the server
  child. That means the server seam (`cli/server.ts`) re-roots both the
  standalone server and the desktop-spawned backend.
- Claude HOME is already per-instance via `ClaudeSettings.homePath`
  (`provider/Drivers/ClaudeHome.ts`) — a settings/data concern, not `config.ts`.

So the re-root does **not** rebuild `ServerConfigShape`; it forces `baseDir` +
`cwd` to `T3PERSON_HOME` and lets the existing `resolveServerConfig` pipeline run
(reusing all port/trace/tailscale logic).

## Decision log

Every row is an upstream file we touched. Keep this current.

### Seam 1 — server config re-root

- **File:** `apps/server/src/cli/server.ts`
- **Change:** in `runServerCommand`, wrap the incoming flags with
  `withPersonHomeFlags(...)` (from `../person/personServerConfig.ts`) before
  calling `resolveServerConfig`. When `T3PERSON_HOME` is set this forces
  `baseDir` + `cwd` flags to the person repo; when unset it returns the flags
  unchanged.
- **Why:** this is the single in-process point where `ServerConfig` is built for
  both the standalone server and the desktop-spawned backend.
- **Re-apply if upstream moves it:** find wherever `resolveServerConfig(flags,
  ...)` is invoked and wrap `flags` with `withPersonHomeFlags`. If
  `resolveServerConfig`'s flag shape changes, update `withPersonHomeFlags` to
  match `CliServerFlags`.

### Seam 2 — desktop-side state re-root (consistency)

- **File:** `apps/desktop/src/main.ts`
- **Change:** at the top of the module (before layer assembly), call
  `applyPersonHomeToProcessEnv()` from `./person/personEnv.ts`. When
  `T3PERSON_HOME` is set and `T3CODE_HOME` is unset, it sets
  `process.env.T3CODE_HOME = T3PERSON_HOME` so the desktop-side
  `DesktopEnvironment.baseDir` (desktop settings/logs) colocates with the
  person repo. `T3PERSON_HOME` stays in env and is inherited by the backend,
  where Seam 1 forces the server `baseDir` + `cwd`.
- **Why:** keep desktop-side state in the same repo as the threads DB.
- **Re-apply if upstream moves it:** ensure the call runs before any layer reads
  `DesktopConfig`/`DesktopEnvironment`.

### Seam 3a — single-instance flag in client contract

- **File:** `packages/contracts/src/server.ts`
- **Change:** add `singleInstance` (optional boolean, default false) to the
  `ServerConfig` struct sent to the client.
- **Why:** the web app needs a server-driven signal to hide the multi-project
  selector. `ServerConfig` is already plumbed end-to-end via `useServerConfig`.
- **Re-apply if upstream moves it:** add the optional field to whatever struct
  backs `server.getConfig`.

### Seam 3b — populate the flag server-side

- **File:** `apps/server/src/ws.ts`
- **Change:** in `loadServerConfig` (the `ServerConfig` payload builder), set
  `singleInstance` from the overlay (`isSingleInstance()` in
  `person/personHome.ts`).
- **Why:** projects the server-side fact onto the client payload.
- **Re-apply if upstream moves it:** find the object literal returned to
  `server.getConfig` and add the field.

### Seam 3c — hide the multi-project selector

- **File:** `apps/web/src/routes/__root.tsx` (and/or
  `apps/web/src/components/AppSidebarLayout.tsx`)
- **Change:** when `serverConfig.singleInstance` is true, do not mount the
  cross-project selector UI. The component is left in place (disable by not
  wiring).
- **Why:** single-instance = one repo; project switching is meaningless.
- **Re-apply if upstream moves it:** gate the selector mount on the
  `singleInstance` flag wherever the sidebar/project chooser is mounted.
