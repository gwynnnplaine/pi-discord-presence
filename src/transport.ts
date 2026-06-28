import { Client } from "@xhayper/discord-rpc";
import type { ConnectError, DiscordClientId, SetActivityPayload, TransportError } from "./types.ts";
import { err, ok, type Result } from "./result.ts";

// Seam: everything the rest of the extension knows about Discord. Faked in tests.
export interface DiscordTransport {
  connect(clientId: DiscordClientId, signal?: AbortSignal): Promise<Result<void, ConnectError>>;
  setActivity(payload: SetActivityPayload): Promise<Result<void, TransportError>>;
  clearActivity(): Promise<Result<void, TransportError>>;
  onClose(listener: () => void): void;
  isConnected(): boolean;
  close(): Promise<void>;
}

const classifyConnect = (e: unknown): ConnectError => {
  const msg = e instanceof Error ? e.message : String(e);
  if (/refused|enoent|could not connect|connection|timed?\s*out|timeout|no(t)? running/i.test(msg)) {
    return { type: "DiscordNotRunning" };
  }
  return { type: "HandshakeFailed", detail: msg };
};

export const createXhayperTransport = (): DiscordTransport => {
  let client: Client | undefined;
  let closeListener: (() => void) | undefined;

  return {
    async connect(clientId) {
      try {
        const c = new Client({ clientId, transport: { type: "ipc" } });
        c.on("disconnected", () => closeListener?.());
        await new Promise<void>((resolve, reject) => {
          c.once("ready", () => resolve());
          c.login().catch(reject);
        });
        client = c;
        return ok(undefined);
      } catch (e) {
        return err(classifyConnect(e));
      }
    },

    async setActivity(payload) {
      const user = client?.user;
      if (!user) return err({ type: "SocketClosed" });
      try {
        await user.setActivity({
          details: payload.details,
          state: payload.state,
          startTimestamp: payload.startTimestamp,
          largeImageKey: payload.largeImageKey,
          largeImageText: payload.largeImageText,
          smallImageKey: payload.smallImageKey,
          smallImageText: payload.smallImageText,
          instance: payload.instance,
        });
        return ok(undefined);
      } catch (e) {
        return err({ type: "SetActivityFailed", detail: e instanceof Error ? e.message : String(e) });
      }
    },

    async clearActivity() {
      const user = client?.user;
      if (!user) return err({ type: "SocketClosed" });
      try {
        await user.clearActivity();
        return ok(undefined);
      } catch (e) {
        return err({ type: "SetActivityFailed", detail: e instanceof Error ? e.message : String(e) });
      }
    },

    onClose(listener) {
      closeListener = listener;
    },

    isConnected() {
      return client?.isConnected ?? false;
    },

    async close() {
      try {
        await client?.destroy();
      } catch {
        // best-effort teardown
      }
      client = undefined;
    },
  };
};
