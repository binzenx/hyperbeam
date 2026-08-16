diff --git a/server.mjs b/server.mjs
new file mode 100644
index 0000000000000000000000000000000000000000..b4b7704b0d1dde37aafd4e9aba50f71b0b14c6b4
--- /dev/null
+++ b/server.mjs
@@ -0,0 +1,103 @@
+import { createReadStream, existsSync, readFileSync } from 'node:fs';
+import { createServer } from 'node:http';
+import { extname, join, normalize } from 'node:path';
+import { fileURLToPath } from 'node:url';
+
+const root = fileURLToPath(new URL('.', import.meta.url));
+loadDotEnv();
+
+const port = Number(process.env.PORT ?? 4173);
+const apiKey = process.env.HYPERBEAM_API_KEY;
+const placeholderApiKey = 'hb_your_api_key_here';
+
+const contentTypes = {
+  '.css': 'text/css; charset=utf-8',
+  '.html': 'text/html; charset=utf-8',
+  '.js': 'text/javascript; charset=utf-8',
+  '.json': 'application/json; charset=utf-8',
+};
+
+function loadDotEnv() {
+  const envPath = join(root, '.env');
+  if (!existsSync(envPath)) return;
+
+  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
+    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
+    if (!match || process.env[match[1]]) continue;
+    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
+  }
+}
+
+function sendJson(response, statusCode, payload) {
+  response.writeHead(statusCode, { 'Content-Type': contentTypes['.json'] });
+  response.end(JSON.stringify(payload));
+}
+
+async function createHyperbeamSession(response) {
+  if (!apiKey) {
+    sendJson(response, 500, {
+      error: 'Missing HYPERBEAM_API_KEY. Copy .env.example to .env, paste your real key, save it, and restart npm start.',
+    });
+    return;
+  }
+
+  if (apiKey === placeholderApiKey) {
+    sendJson(response, 500, {
+      error: 'HYPERBEAM_API_KEY is still the placeholder value. Replace it in .env with your real Hyperbeam API key and restart npm start.',
+    });
+    return;
+  }
+
+  const hyperbeamResponse = await fetch('https://engine.hyperbeam.com/v0/vm', {
+    method: 'POST',
+    headers: {
+      Authorization: `Bearer ${apiKey}`,
+      'Content-Type': 'application/json',
+    },
+    body: JSON.stringify({ width: 1280, height: 720, fps: 30 }),
+  });
+
+  const data = await hyperbeamResponse.json();
+  if (!hyperbeamResponse.ok) {
+    sendJson(response, hyperbeamResponse.status, { error: data });
+    return;
+  }
+
+  sendJson(response, 200, { embed_url: data.embed_url, session_id: data.session_id });
+}
+
+function serveStatic(request, response) {
+  const requestPath = new URL(request.url, `http://${request.headers.host}`).pathname;
+  const safePath = normalize(requestPath === '/' ? '/index.html' : requestPath).replace(/^[/\\]+/, '');
+  const filePath = join(root, safePath);
+
+  if (!filePath.startsWith(root) || !existsSync(filePath)) {
+    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
+    response.end('Not found');
+    return;
+  }
+
+  response.writeHead(200, { 'Content-Type': contentTypes[extname(filePath)] ?? 'application/octet-stream' });
+  createReadStream(filePath).pipe(response);
+}
+
+createServer(async (request, response) => {
+  try {
+    if (request.method === 'POST' && request.url === '/api/hyperbeam/session') {
+      await createHyperbeamSession(response);
+      return;
+    }
+
+    if (request.method === 'GET') {
+      serveStatic(request, response);
+      return;
+    }
+
+    response.writeHead(405, { Allow: 'GET, POST' });
+    response.end('Method not allowed');
+  } catch (error) {
+    sendJson(response, 500, { error: error.message });
+  }
+}).listen(port, () => {
+  console.log(`Hyperbeam embed demo running at http://localhost:${port}`);
+});
