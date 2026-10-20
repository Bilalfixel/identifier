/**
 * Vercel Function adapter. The original prompt engine handles credentials,
 * identity-locked analysis and JSON output; all UI resources are served only
 * after password verification. No images are saved to the filesystem.
 *
 * The private/ files are bundled with the Function (see vercel.json), NOT
 * hosted in Vercel's public/ directory, preventing anonymous access.
 */
import worker from '../lib/worker-core.js';
import { readFile } from 'node:fs/promises';

const files = {
  '/': { name: 'index.html', type: 'text/html; charset=utf-8' },
  '/index.html': { name: 'index.html', type: 'text/html; charset=utf-8' },
  '/app.js': { name: 'app.js', type: 'application/javascript; charset=utf-8' },
  '/style.css': { name: 'style.css', type: 'text/css; charset=utf-8' },
};

// Different Vercel rewrites can preserve the source URL or use destination.
// We set an explicit 'ips_route' query flag in each rewrite to handle both.
const rewrites = new Map([
  ['home', '/'], ['html', '/index.html'], ['script', '/app.js'],
  ['style', '/style.css'], ['config', '/api/config'],
  ['generate', '/api/generate'], ['health', '/health'],
]);

export default {
  async fetch(request) {
    const incoming = new URL(request.url);
    const route = rewrites.get(incoming.searchParams.get('ips_route')) || incoming.pathname;
    const routed = new URL(incoming);
    routed.pathname = route;
    routed.searchParams.delete('ips_route');
    const forwarded = new Request(routed, request);

    const env = {
      SITE_PASSWORD: process.env.SITE_PASSWORD || '',
      OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
      ASSETS: {
        async fetch(assetRequest) {
          const key = new URL(assetRequest.url).pathname;
          const entry = files[key];
          if (!entry) return new Response('Not found', { status: 404 });
          try {
            const file = await readFile(new URL('../private/' + entry.name, import.meta.url));
            return new Response(file, { status: 200, headers: { 'Content-Type': entry.type } });
          } catch (_) {
            return new Response('Asset missing from deployment bundle. Check vercel.json includeFiles.', { status: 500 });
          }
        }
      }
    };
    try {
      return await worker.fetch(forwarded, env);
    } catch (e) {
      console.error('Unhandled server error:', e);
      return Response.json({ error: 'Server error. Check Vercel function logs.' }, { status: 500 });
    }
  }
};
