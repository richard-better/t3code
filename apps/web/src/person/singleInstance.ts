/**
 * Single-instance ("person") mode — client signal.
 *
 * Overlay module — see /RICHARD_PATCHES.md. Reads the server-provided
 * `singleInstance` flag from the shared `ServerConfig` payload. Returns false
 * when the flag is absent (version-skew safe) or the config has not loaded yet,
 * so multi-project UI stays visible by default.
 *
 * @module person/singleInstance
 */
import { useServerConfig } from "../rpc/serverState";

/** True when the connected server is bound to a single repo ("a person"). */
export function useSingleInstance(): boolean {
  return useServerConfig()?.singleInstance ?? false;
}
