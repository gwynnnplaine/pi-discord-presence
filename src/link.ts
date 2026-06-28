import type { DiscordTransport } from "./transport.ts";
import type { DesiredPresence, DiscordClientId, TransportError } from "./types.ts";
import { ok, type Result } from "./result.ts";
import { toPayload } from "./render.ts";

// Connection state machine with lazy reconnect (Q7): connect on demand,
// stay silent when Discord is unavailable, reconnect on the next push after a drop.
export interface PresenceLink {
  push(desired: DesiredPresence): Promise<Result<void, TransportError>>;
  disconnect(): Promise<void>;
}

export const createPresenceLink = (args: {
  readonly transport: DiscordTransport;
  readonly clientId: DiscordClientId;
}): PresenceLink => {
  let connected = false;
  args.transport.onClose(() => {
    connected = false;
  });

  const ensure = async (): Promise<boolean> => {
    if (connected && args.transport.isConnected()) return true;
    const result = await args.transport.connect(args.clientId);
    connected = result.ok; // DiscordNotRunning / HandshakeFailed → false, silent
    return result.ok;
  };

  return {
    async push(desired) {
      const up = await ensure();
      if (!up) return ok(undefined); // silent no-op when Discord is unavailable
      const result =
        desired.kind === "card"
          ? await args.transport.setActivity(toPayload(desired.card))
          : await args.transport.clearActivity();
      if (!result.ok) connected = false; // drop → reconnect on next push
      return result;
    },

    async disconnect() {
      connected = false;
      await args.transport.close();
    },
  };
};
