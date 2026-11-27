// Ridge Runner — a tiny static server for local play (Node 22, standard
// library only). Serves this directory on http://localhost:8080.
// Not part of the submitted game; the game itself is plain static files.

import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const root = join(here, 'game');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg' };

createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const file = join(root, path === '/' ? 'index.html' : path);
  if (!existsSync(file) || !file.startsWith(root)) {
    res.writeHead(404);
    res.end('not found');
    return;
  }
  try {
    res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  } catch {
    res.writeHead(500);
    res.end('error');
  }
}).listen(8080, () => console.log('Ridge Runner at http://localhost:8080'));
