import type { DesiredPresence, EpochMillis, TransportError } from "./types.ts";
import type { Result } from "./result.ts";

export type CancelHandle = () => void;

export interface Clock {
  now(): EpochMillis;
  schedule(delayMs: number, fn: () => void): CancelHandle;
}

export const systemClock = (): Clock => ({
  now: () => Date.now() as EpochMillis,
  schedule: (delayMs, fn) => {
    const handle = setTimeout(fn, delayMs);
    return () => clearTimeout(handle);
  },
});

export interface PresenceScheduler {
  request(desired: DesiredPresence): void;
  stop(): void;
}

// Coalesce-latest + trailing-flush rate limiter: at most one push per
// minIntervalMs, always carrying the most recent desired state (Q5).
export const createScheduler = (args: {
  readonly clock: Clock;
  readonly minIntervalMs: number;
  readonly push: (desired: DesiredPresence) => Promise<Result<void, TransportError>>;
}): PresenceScheduler => {
  let desired: DesiredPresence | undefined;
  let lastSentAt = 0;
  let timer: CancelHandle | undefined;
  let sending = false;

  const flush = (): void => {
    timer = undefined;
    if (desired === undefined || sending) return;
    const payload = desired;
    desired = undefined;
    sending = true;
    lastSentAt = args.clock.now();
    void args.push(payload).then(
      () => finishSend(),
      () => finishSend(),
    );
  };

  const finishSend = (): void => {
    sending = false;
    if (desired !== undefined) schedule();
  };

  const schedule = (): void => {
    if (timer !== undefined || sending) return;
    const elapsed = args.clock.now() - lastSentAt;
    if (elapsed >= args.minIntervalMs) flush();
    else timer = args.clock.schedule(args.minIntervalMs - elapsed, flush);
  };

  return {
    request(next) {
      desired = next;
      schedule();
    },
    stop() {
      if (timer !== undefined) {
        timer();
        timer = undefined;
      }
      desired = undefined;
    },
  };
};
