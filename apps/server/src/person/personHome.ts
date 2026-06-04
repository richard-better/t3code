/**
 * Single-instance ("person") mode detection.
 *
 * Overlay module — see /RICHARD_PATCHES.md. When `T3PERSON_HOME` is set (env, or
 * `--person-home <dir>` argv), the running instance binds to one repo ("a
 * person"). Every export is inert (returns `undefined`/`false`) when unset, so
 * the fork behaves like upstream by default.
 *
 * @module person/personHome
 */

const PERSON_HOME_ENV_VAR = "T3PERSON_HOME";
const PERSON_HOME_ARGV_FLAG = "--person-home";

const trimToUndefined = (value: string | undefined): string | undefined => {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const fromArgv = (argv: ReadonlyArray<string>): string | undefined => {
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === PERSON_HOME_ARGV_FLAG) {
      return trimToUndefined(argv[index + 1]);
    }
    if (arg !== undefined && arg.startsWith(`${PERSON_HOME_ARGV_FLAG}=`)) {
      return trimToUndefined(arg.slice(PERSON_HOME_ARGV_FLAG.length + 1));
    }
  }
  return undefined;
};

/**
 * The person repo directory, or `undefined` when single-instance mode is off.
 * Path expansion/resolution is left to the downstream config pipeline
 * (`resolveServerConfig`), which already handles `~` and relative paths.
 */
export const resolvePersonHome = (
  env: NodeJS.ProcessEnv = process.env,
  argv: ReadonlyArray<string> = process.argv,
): string | undefined => trimToUndefined(env[PERSON_HOME_ENV_VAR]) ?? fromArgv(argv);

/** True when single-instance ("person") mode is engaged. */
export const isSingleInstance = (
  env: NodeJS.ProcessEnv = process.env,
  argv: ReadonlyArray<string> = process.argv,
): boolean => resolvePersonHome(env, argv) !== undefined;

export { PERSON_HOME_ENV_VAR, PERSON_HOME_ARGV_FLAG };
