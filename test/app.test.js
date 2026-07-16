import test from 'node:test';
import assert from 'node:assert/strict';
import { createApiImpulseServer } from '../src/app.js';

async function withServer(checker, callback) {
  const server = createApiImpulseServer({ checker });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  try {
    await callback(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('expõe health check', async () => {
  await withServer(async () => {}, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: 'ok', version: '0.1.0' });
  });
});

test('verifica endpoint e persiste no histórico em memória', async () => {
  const fakeResult = {
    id: 'abc', url: 'https://example.com/', checkedAt: new Date(0).toISOString(),
    status: 200, statusText: 'OK', latencyMs: 12, available: true, error: null
  };
  await withServer(async () => fakeResult, async (baseUrl) => {
    const created = await fetch(`${baseUrl}/api/check`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url: 'https://example.com' })
    });
    assert.equal(created.status, 201);
    const history = await fetch(`${baseUrl}/api/checks`).then((response) => response.json());
    assert.deepEqual(history.checks, [fakeResult]);
  });
});
