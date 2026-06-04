/**
 * Single-instance server config re-root.
 *
 * Overlay module — see /RICHARD_PATCHES.md (Seam 1). Forces `baseDir` + `cwd`
 * to the person repo when single-instance mode is engaged, then lets the
 * existing `resolveServerConfig` pipeline derive the rest (threads DB, caches,
 * worktrees, ports, tracing, …). Reuses upstream logic rather than rebuilding
 * `ServerConfigShape`.
 *
 * @module person/personServerConfig
 */
import * as Option from "effect/Option";

import type { CliServerFlags } from "../cli/config.ts";
import { resolvePersonHome } from "./personHome.ts";

/**
 * Returns the flags unchanged when `T3PERSON_HOME` is unset. When set, overrides
 * `baseDir` (drives `state.sqlite`/caches/worktrees) and `cwd` (provider session
 * working directory) so the whole instance roots at the person repo.
 */
export const withPersonHomeFlags = (flags: CliServerFlags): CliServerFlags => {
  const personHome = resolvePersonHome();
  if (personHome === undefined) {
    return flags;
  }
  return {
    ...flags,
    baseDir: Option.some(personHome),
    cwd: Option.some(personHome),
  };
};
