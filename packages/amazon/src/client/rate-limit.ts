interface BucketState {
  tokens: number;
  updatedAt: number;
}

const buckets = new Map<string, BucketState>();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface RateLimit {
  rate: number;
  burst: number;
}

export async function acquireSlot(key: string, limit: RateLimit): Promise<void> {
  const rate = Math.max(limit.rate, 0.0001);
  const capacity = Math.max(limit.burst, 1);
  for (;;) {
    const now = Date.now();
    let state = buckets.get(key);
    if (!state) {
      state = { tokens: capacity, updatedAt: now };
      buckets.set(key, state);
    }
    const refill = ((now - state.updatedAt) / 1000) * rate;
    state.tokens = Math.min(capacity, state.tokens + refill);
    state.updatedAt = now;
    if (state.tokens >= 1) {
      state.tokens -= 1;
      return;
    }
    const waitMs = Math.ceil(((1 - state.tokens) / rate) * 1000);
    await sleep(Math.min(Math.max(waitMs, 25), 30_000));
  }
}
