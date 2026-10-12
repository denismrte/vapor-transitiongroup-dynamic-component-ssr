// SSR of a VDOM root rendering the Vapor List component, then client hydration
// of the same tree in headless Chrome with `vaporInteropPlugin` and the Vapor-compiled List. Prints the SSR HTML, every
// browser console message and the verdict; exit 1 when the console carries a hydration mismatch.
// Chrome: CHROME_BIN, else the macOS default path.
import { createServer } from 'node:http'
import { readFileSync, mkdtempSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { createSSRApp, h, version } from 'vue'
import { renderToString } from 'vue/server-renderer'
import List from './out/List.ssr.mjs'

const app = createSSRApp({ render: () => h(List) })
const html = await renderToString(app)
console.log('vue ' + version + '\nSSR: ' + html)

const page = `<!doctype html><html><head><script type="importmap">{"imports":{"vue":"/vue.js"}}</script></head><body><div id="app">${html}</div>
<script type="module">
import { createSSRApp, h, vaporInteropPlugin } from 'vue'
import List from '/List.client.mjs'
const app = createSSRApp({ render: () => h(List) })
app.use(vaporInteropPlugin)
app.mount('#app')
window.__done = document.getElementById('app').innerHTML
</script></body></html>`
const files = { '/': [page, 'text/html'], '/vue.js': [readFileSync('node_modules/vue/dist/vue.runtime-with-vapor.esm-browser.js', 'utf8'), 'text/javascript'], '/List.client.mjs': [readFileSync('out/List.client.mjs', 'utf8'), 'text/javascript'] }
const server = createServer((req, res) => { const f = files[req.url]; if (!f) { res.statusCode = 404; return res.end() } res.setHeader('content-type', f[1]); res.end(f[0]) })
await new Promise((r) => server.listen(0, '127.0.0.1', r))
const url = 'http://127.0.0.1:' + server.address().port + '/'

const bin = process.env.CHROME_BIN ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const port = 9800 + Math.floor(Math.random() * 150)
const chrome = spawn(bin, ['--headless=new', '--remote-debugging-port=' + port, '--user-data-dir=' + mkdtempSync(tmpdir() + '/repro-'), '--no-first-run', 'about:blank'], { stdio: 'ignore' })
let ws
for (let i = 0; i < 50 && !ws; i++) { await new Promise((r) => setTimeout(r, 200)); try { ws = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === 'page')?.webSocketDebuggerUrl } catch {} }
const sock = new WebSocket(ws); await new Promise((r) => sock.addEventListener('open', r))
let id = 0; const pending = new Map()
const send = (method, params = {}) => new Promise((ok) => { pending.set(++id, ok); sock.send(JSON.stringify({ id, method, params })) })
const lines = []
sock.addEventListener('message', (e) => { const m = JSON.parse(e.data)
  if (m.id && pending.has(m.id)) pending.get(m.id)(m.result)
  if (m.method === 'Runtime.consoleAPICalled') lines.push(`[${m.params.type}] ` + m.params.args.map((a) => a.value ?? a.description ?? '').join(' '))
  if (m.method === 'Runtime.exceptionThrown') lines.push('[exception] ' + (m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text)) })
const browser = (await (await fetch(`http://127.0.0.1:${port}/json/version`)).json()).Browser
console.log('node ' + process.version + ' · ' + browser)
await send('Runtime.enable'); await send('Page.enable'); await send('Page.navigate', { url })
await new Promise((r) => setTimeout(r, 2500))
const after = await send('Runtime.evaluate', { expression: 'window.__done ?? null', returnByValue: true })
sock.close(); chrome.kill(); server.close()
console.log('console:\n' + (lines.join('\n') || '(none)'))
console.log('DOM after mount: ' + after?.result?.value)
const mismatch = lines.some((l) => /hydration/i.test(l) && /mismatch|never exited|No current hydration node/i.test(l))
console.log(mismatch ? 'VERDICT: hydration mismatch' : 'VERDICT: clean hydration')
process.exit(mismatch ? 1 : 0)
