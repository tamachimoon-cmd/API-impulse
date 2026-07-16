import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CheckHistory } from './history.js';
import { checkEndpoint } from './monitor.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, '../public');
const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8'
};

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store'
  });
  response.end(JSON.stringify(payload));
}

async function readJson(request) {
  const chunks = [];
  let size = 0;

  for await (const chunk of request) {
    size += chunk.length;
    if (size > 32_000) throw new Error('Corpo da requisição excede 32 KB.');
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error('JSON inválido.');
  }
}

async function serveStatic(requestPath, response) {
  const relativePath = requestPath === '/' ? 'index.html' : requestPath.slice(1);
  const normalized = path.normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, '');
  const filePath = path.join(publicDir, normalized);

  if (!filePath.startsWith(publicDir)) return false;

  try {
    const file = await fs.readFile(filePath);
    const extension = path.extname(filePath);
    response.writeHead(200, {
      'content-type': contentTypes[extension] ?? 'application/octet-stream',
      'cache-control': extension === '.html' ? 'no-cache' : 'public, max-age=3600'
    });
    response.end(file);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

export function createApiImpulseServer({ checker = checkEndpoint, history = new CheckHistory() } = {}) {
  return http.createServer(async (request, response) => {
    const requestUrl = new URL(request.url, 'http://localhost');

    try {
      if (request.method === 'GET' && requestUrl.pathname === '/api/health') {
        return sendJson(response, 200, { status: 'ok', version: '0.1.0' });
      }

      if (request.method === 'GET' && requestUrl.pathname === '/api/checks') {
        return sendJson(response, 200, { checks: history.list() });
      }

      if (request.method === 'DELETE' && requestUrl.pathname === '/api/checks') {
        history.clear();
        return sendJson(response, 200, { checks: [] });
      }

      if (request.method === 'POST' && requestUrl.pathname === '/api/check') {
        const body = await readJson(request);
        const result = await checker(body.url);
        history.add(result);
        return sendJson(response, 201, result);
      }

      if (request.method === 'GET' || request.method === 'HEAD') {
        const served = await serveStatic(requestUrl.pathname, response);
        if (served) return;
      }

      return sendJson(response, 404, { error: 'Rota não encontrada.' });
    } catch (error) {
      return sendJson(response, 400, { error: error.message || 'Falha inesperada.' });
    }
  });
}
