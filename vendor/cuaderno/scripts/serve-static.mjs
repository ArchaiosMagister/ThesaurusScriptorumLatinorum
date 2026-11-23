import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';

const root = resolve('dist');
const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
    // Montaje de prueba bajo la misma subruta que usa GitHub Pages.
    const mount = '/CuadernoTextosLatinos';
    const nested = pathname === mount || pathname.startsWith(mount + '/');
    const localPath = nested ? pathname.slice(mount.length) || '/' : pathname;
    const file = resolve(root, '.' + (localPath.endsWith('/') ? localPath + 'index.html' : localPath));
    if (!file.startsWith(root + sep)) {
      response.writeHead(403);
      response.end('Prohibido');
      return;
    }
    const extension = file.slice(file.lastIndexOf('.'));
    const content = await readFile(file);
    response.writeHead(200, {
      'content-type': mimeTypes[extension] ?? 'application/octet-stream',
      'cache-control': 'no-store',
    });
    response.end(content);
  } catch {
    response.writeHead(404);
    response.end('No encontrado');
  }
}).listen(Number(process.env.PORT ?? 4173), '127.0.0.1');
