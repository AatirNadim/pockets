const MAX_ATTEMPTS = 4; // Initial request plus three retries.
const TIMEOUT_MS = 75_000;
const BACKOFF_MS = 5_000;

export default {
  scheduled(controller, env, ctx) {
    ctx.waitUntil(pingHealth(env.HEALTH_URL, { scheduledTime: controller.scheduledTime }));
  },
};

// Dependencies can be supplied by tests; production uses the Worker runtime APIs.
export async function pingHealth(url, {
  scheduledTime,
  fetchRequest = fetch,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  timeoutSignal = (ms) => AbortSignal.timeout(ms),
  now = Date.now,
  logger = console,
} = {}) {
  let endpoint;
  try {
    endpoint = new URL(url);
    if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password) throw new Error();
  } catch {
    throw new Error('HEALTH_URL must be a valid HTTPS URL without credentials');
  }

  logger.log('Starting Render health ping', {
    scheduledTime: Number.isFinite(scheduledTime) ? new Date(scheduledTime).toISOString() : null,
    startedAt: new Date(now()).toISOString(),
  });

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const started = now();
    const signal = timeoutSignal(TIMEOUT_MS);
    try {
      const response = await fetchRequest(endpoint.href, {
        headers: { 'User-Agent': 'PocketsKeepAlive/1.0', 'Cache-Control': 'no-cache' },
        cache: 'no-store',
        signal,
      });
      // The status is sufficient for this liveness check; do not buffer the body.
      // A cleanup failure must not turn an otherwise successful ping into a failure.
      if (response.body) void response.body.cancel().catch(() => {});
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      logger.log('Render health ping succeeded', { attempt, status: response.status, elapsedMs: now() - started });
      return;
    } catch (error) {
      const reason = signal.aborted ? 'request timed out' : error instanceof Error ? error.message : 'unknown error';
      logger.error('Render health ping failed', { attempt, maxAttempts: MAX_ATTEMPTS, elapsedMs: now() - started, reason });
      if (attempt === MAX_ATTEMPTS) throw new Error(`Render health ping failed after ${MAX_ATTEMPTS} attempts: ${reason}`);
      await sleep(attempt * BACKOFF_MS);
    }
  }
}
