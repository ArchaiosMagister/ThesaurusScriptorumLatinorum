import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const base = '/AdministratorTextorumLatinorum/';
const root = fileURLToPath(new URL('../dist', import.meta.url));
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2'
};

createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
    if (!pathname.startsWith(base)) throw new Error('Ruta desconocida');
    const relative = pathname.slice(base.length) + (pathname.endsWith('/') ? 'index.html' : '');
    const filename = resolve(root, relative);
    if (!filename.startsWith(root + sep)) throw new Error('Ruta desconocida');
    const body = await readFile(filename);
    response.writeHead(200, { 'Content-Type': mime[extname(filename)] || 'application/octet-stream' });
    response.end(body);
  } catch {
    response.writeHead(404);
    response.end();
  }
}).listen(8123, '127.0.0.1');
