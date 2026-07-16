import dns from 'node:dns/promises';
import net from 'node:net';
import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';

const DEFAULT_TIMEOUT_MS = 8_000;

export function validateTargetUrl(rawUrl) {
  if (typeof rawUrl !== 'string' || rawUrl.trim() === '') {
    throw new TypeError('Informe uma URL válida.');
  }

  let target;
  try {
    target = new URL(rawUrl.trim());
  } catch {
    throw new TypeError('A URL informada não pôde ser interpretada.');
  }

  if (!['http:', 'https:'].includes(target.protocol)) {
    throw new TypeError('Apenas URLs HTTP e HTTPS são aceitas.');
  }

  target.username = '';
  target.password = '';
  target.hash = '';
  return target;
}

export function isPrivateIp(address) {
  if (!net.isIP(address)) return false;

  if (address === '::1' || address === '::') return true;
  if (address.startsWith('fc') || address.startsWith('fd') || address.startsWith('fe80:')) return true;

  const normalized = address.replace(/^::ffff:/, '');
  const parts = normalized.split('.').map(Number);
  if (parts.length !== 4 || parts.some(Number.isNaN)) return false;

  const [a, b] = parts;
  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127)
  );
}

export async function assertSafeTarget(target, { allowPrivateTargets = false, lookup = dns.lookup } = {}) {
  if (allowPrivateTargets) return;

  const hostname = target.hostname.toLowerCase();
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
    throw new Error('Destinos locais estão bloqueados por segurança.');
  }

  const addresses = await lookup(hostname, { all: true, verbatim: true });
  if (!addresses.length) {
    throw new Error('Não foi possível resolver o endereço informado.');
  }

  if (addresses.some(({ address }) => isPrivateIp(address))) {
    throw new Error('Endereços privados ou reservados estão bloqueados por segurança.');
  }
}

export async function checkEndpoint(rawUrl, options = {}) {
  const target = validateTargetUrl(rawUrl);
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const allowPrivateTargets = options.allowPrivateTargets ?? process.env.ALLOW_PRIVATE_TARGETS === 'true';

  await assertSafeTarget(target, { allowPrivateTargets, lookup: options.lookup });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = new Date();
  const started = performance.now();

  try {
    const response = await (options.fetchImpl ?? fetch)(target, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': 'API-Impulse/0.1 (+https://github.com/tamachimoon-cmd/API-impulse)',
        accept: '*/*'
      }
    });

    const latencyMs = Math.round(performance.now() - started);
    await response.body?.cancel();

    return {
      id: randomUUID(),
      url: target.toString(),
      checkedAt: startedAt.toISOString(),
      status: response.status,
      statusText: response.statusText,
      latencyMs,
      available: response.status < 500,
      error: null
    };
  } catch (error) {
    const latencyMs = Math.round(performance.now() - started);
    const message = error?.name === 'AbortError' ? `Tempo limite de ${timeoutMs} ms excedido.` : error.message;

    return {
      id: randomUUID(),
      url: target.toString(),
      checkedAt: startedAt.toISOString(),
      status: null,
      statusText: null,
      latencyMs,
      available: false,
      error: message
    };
  } finally {
    clearTimeout(timeout);
  }
}
