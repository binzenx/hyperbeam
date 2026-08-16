diff --git a/app.js b/app.js
new file mode 100644
index 0000000000000000000000000000000000000000..7e755ac42c132dee9209a54678aeb18aee9eab8a
--- /dev/null
+++ b/app.js
@@ -0,0 +1,71 @@
+const formInput = document.querySelector('#embed-url');
+const createButton = document.querySelector('#create-button');
+const loadButton = document.querySelector('#load-button');
+const container = document.querySelector('#hyperbeam-container');
+const statusText = document.querySelector('#status');
+
+function setStatus(message, isError = false) {
+  statusText.textContent = message;
+  statusText.style.color = isError ? '#fecaca' : '#bfdbfe';
+}
+
+function isHyperbeamUrl(value) {
+  try {
+    const url = new URL(value);
+    return url.protocol === 'https:' && url.hostname.endsWith('.hyperbeam.com');
+  } catch {
+    return false;
+  }
+}
+
+function loadHyperbeamEmbed() {
+  const embedUrl = formInput.value.trim();
+
+  if (!isHyperbeamUrl(embedUrl)) {
+    setStatus('Enter a valid HTTPS Hyperbeam embed URL, for example https://abc.hyperbeam.com/...?token=...', true);
+    formInput.focus();
+    return;
+  }
+
+  container.classList.remove('embed-placeholder');
+  container.replaceChildren();
+
+  const iframe = document.createElement('iframe');
+  iframe.title = 'Hyperbeam virtual computer';
+  iframe.allow = 'clipboard-read; clipboard-write; fullscreen; microphone; camera; autoplay';
+  iframe.referrerPolicy = 'no-referrer';
+  iframe.src = embedUrl;
+
+  container.append(iframe);
+  setStatus('Hyperbeam embed loaded.');
+}
+
+async function createSession() {
+  setStatus('Creating Hyperbeam session...');
+  createButton.disabled = true;
+
+  try {
+    const response = await fetch('/api/hyperbeam/session', { method: 'POST' });
+    const data = await response.json();
+
+    if (!response.ok) {
+      throw new Error(typeof data.error === 'string' ? data.error : JSON.stringify(data.error));
+    }
+
+    formInput.value = data.embed_url;
+    loadHyperbeamEmbed();
+  } catch (error) {
+    setStatus(`Could not create a Hyperbeam session: ${error.message}`, true);
+  } finally {
+    createButton.disabled = false;
+  }
+}
+
+createButton.addEventListener('click', createSession);
+loadButton.addEventListener('click', loadHyperbeamEmbed);
+formInput.addEventListener('keydown', (event) => {
+  if (event.key === 'Enter') {
+    event.preventDefault();
+    loadHyperbeamEmbed();
+  }
+});
