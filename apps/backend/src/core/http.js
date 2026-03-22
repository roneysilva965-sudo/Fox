import { URL } from 'node:url';

export function json(response, statusCode, payload) {
  response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
}

export async function readJsonBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (chunks.length === 0) {
    return {};
  }

  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

export function notFound(response) {
  json(response, 404, { message: 'Route not found' });
}

export function methodNotAllowed(response, methods) {
  response.writeHead(405, { Allow: methods.join(', ') });
  response.end();
}

export function parseRequestUrl(request) {
  return new URL(request.url, 'http://localhost');
}
