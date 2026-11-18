/**
 * The SteamClient to call.
 *
 * In Decky (shared context) the global SteamClient is the full one. A Big Picture popup window
 * has a SteamClient of its own that lacks most interfaces (Screenshots, and more): seen in a
 * real client. The Millennium build therefore publishes the shared context's SteamClient as
 * __ps3SteamClient (standalone/prelude.ts), and everything goes through this accessor.
 */
export function steamClient(): typeof SteamClient {
  return ((globalThis as { __ps3SteamClient?: typeof SteamClient }).__ps3SteamClient ?? SteamClient);
}
