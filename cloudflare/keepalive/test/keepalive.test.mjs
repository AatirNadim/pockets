import test from 'node:test';
import assert from 'node:assert/strict';
import worker, { pingHealth } from '../src/index.mjs';

const url = 'https://example.com/health';
const quiet = { log() {}, error() {} };
const options = { logger: quiet, sleep: async () => {} };

test('sends an uncached health request and accepts a 2xx response', async () => {
  await pingHealth(url, { ...options, fetchRequest: async (target, init) => {
    assert.equal(target, url);
    assert.equal(init.cache, 'no-store');
    assert.ok(init.signal);
    return new Response('ok', { status: 200 });
  } });
});

test('retries HTTP and network failures with incremental backoff', async () => {
  let calls = 0;
  const delays = [];
  await pingHealth(url, { ...options, sleep: async (ms) => delays.push(ms), fetchRequest: async () => {
    calls++;
    if (calls === 1) return new Response(null, { status: 503 });
    if (calls === 2) throw new TypeError('network error');
    return new Response(null, { status: 204 });
  } });
  assert.equal(calls, 3);
  assert.deepEqual(delays, [5000, 10000]);
});

test('reports failure after four timed-out attempts', async () => {
  let calls = 0;
  const delays = [];
  const messages = [];
  await assert.rejects(pingHealth(url, {
    ...options,
    sleep: async (ms) => delays.push(ms),
    logger: { log() {}, error(_message, details) { messages.push(details.reason); } },
    timeoutSignal: (ms) => { assert.equal(ms, 75000); return AbortSignal.abort(); },
    fetchRequest: async () => { calls++; throw new Error('aborted'); },
  }), /failed after 4 attempts: request timed out/);
  assert.equal(calls, 4);
  assert.deepEqual(delays, [5000, 10000, 15000]);
  assert.deepEqual(messages, Array(4).fill('request timed out'));
});

test('rejects invalid configuration before sending requests', async () => {
  let calls = 0;
  for (const value of [undefined, 'http://example.com', 'https://user:secret@example.com']) {
    await assert.rejects(pingHealth(value, { ...options, fetchRequest: async () => { calls++; } }), /valid HTTPS URL/);
  }
  assert.equal(calls, 0);
});

test('scheduled handler registers the request with waitUntil', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(null, { status: 200 });
  try {
    let pending;
    worker.scheduled({ scheduledTime: Date.now() }, { HEALTH_URL: url }, { waitUntil(promise) { pending = promise; } });
    assert.ok(pending instanceof Promise);
    await pending;
  } finally {
    globalThis.fetch = originalFetch;
  }
});
