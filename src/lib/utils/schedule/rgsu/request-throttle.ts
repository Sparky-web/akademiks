type Wait = (delayMs: number) => Promise<void>;

const defaultWait: Wait = (delayMs) =>
  new Promise((resolve) => setTimeout(resolve, delayMs));

export const createRequestThrottle = (
  intervalMs: number,
  now: () => number = Date.now,
  wait: Wait = defaultWait,
) => {
  let nextRequestAt = 0;
  let queue = Promise.resolve();

  return (): Promise<void> => {
    const request = queue.then(async () => {
      const delayMs = Math.max(0, nextRequestAt - now());
      if (delayMs > 0) await wait(delayMs);
      nextRequestAt = now() + intervalMs;
    });

    queue = request.catch(() => undefined);
    return request;
  };
};
