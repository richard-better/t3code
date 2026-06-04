/**
 * Desktop-side single-instance env normalization.
 *
 * Overlay module — see /RICHARD_PATCHES.md (Seam 2). When `T3PERSON_HOME` is set
 * and `T3CODE_HOME` is unset, point `T3CODE_HOME` at the same repo so the
 * desktop-side `DesktopEnvironment.baseDir` (desktop settings/logs) colocates
 * with the person repo. `T3PERSON_HOME` stays in the environment and is
 * inherited by the spawned backend, where the server seam re-roots `baseDir` +
 * `cwd`. No-op when `T3PERSON_HOME` is unset.
 *
 * @module person/personEnv
 */

const PERSON_HOME_ENV_VAR = "T3PERSON_HOME";
const T3CODE_HOME_ENV_VAR = "T3CODE_HOME";

const trimToUndefined = (value: string | undefined): string | undefined => {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

/**
 * Mutates the given environment (defaults to `process.env`) so desktop-side
 * state colocates with the person repo. Must run before any layer reads
 * `DesktopConfig`/`DesktopEnvironment`.
 */
export const applyPersonHomeToProcessEnv = (env: NodeJS.ProcessEnv = process.env): void => {
  const personHome = trimToUndefined(env[PERSON_HOME_ENV_VAR]);
  if (personHome === undefined) {
    return;
  }
  if (trimToUndefined(env[T3CODE_HOME_ENV_VAR]) === undefined) {
    env[T3CODE_HOME_ENV_VAR] = personHome;
  }
};

export { PERSON_HOME_ENV_VAR };
