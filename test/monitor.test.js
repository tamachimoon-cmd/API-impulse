import test from 'node:test';
import assert from 'node:assert/strict';
import { isPrivateIp, validateTargetUrl, assertSafeTarget, checkEndpoint } from '../src/monitor.js';

test('aceita somente HTTP e HTTPS', () => {
  assert.equal(validateTargetUrl('https://example.com/path#x').toString(), 'https://example.com/path');
  assert.throws(() => validateTargetUrl('file:///etc/passwd'), /HTTP e HTTPS/);
});

test('identifica faixas privadas e reservadas', () => {
  assert.equal(isPrivateIp('127.0.0.1'), true);
  assert.equal(isPrivateIp('10.1.2.3'), true);
  assert.equal(isPrivateIp('172.20.1.1'), true);
  assert.equal(isPrivateIp('192.168.1.1'), true);
  assert.equal(isPrivateIp('8.8.8.8'), false);
});

test('bloqueia destino que resolve para IP privado', async () => {
  await assert.rejects(
    assertSafeTarget(new URL('https://internal.example'), {
      lookup: async () => [{ address: '10.0.0.1', family: 4 }]
    }),
    /bloqueados/
  );
});

test('registra status e latência da resposta', async () => {
  const result = await checkEndpoint('https://example.com', {
    lookup: async () => [{ address: '93.184.216.34', family: 4 }],
    fetchImpl: async () => ({
      status: 204,
      statusText: 'No Content',
      body: { cancel: async () => {} }
    })
  });
  assert.equal(result.status, 204);
  assert.equal(result.available, true);
  assert.equal(result.error, null);
  assert.ok(result.latencyMs >= 0);
});
