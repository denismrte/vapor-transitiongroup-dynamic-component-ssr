# Vapor `<TransitionGroup>` inside `<component :is>`: 3.6.0-rc.11 SSR adds fragment ranges the Vapor client does not hydrate

`List.vue` is a `<script setup vapor>` component: `<component :is="tag">` (a plain element tag) wrapping an `<ol>` with a
`<TransitionGroup>` over a keyed `v-for`.

- `build.mjs` compiles it with `@vue/compiler-sfc` twice, as an SSR build and a client build do (`out/List.ssr.mjs`,
  `out/List.client.mjs`).
- `run.mjs` server-renders a VDOM root `createSSRApp({ render: () => h(List) })` with `renderToString`, then hydrates the
  same root in headless Chrome with `vaporInteropPlugin` and the Vapor-compiled `List`
  (`vue.runtime-with-vapor.esm-browser.js`). It prints the SSR HTML, the browser console and a verdict, and exits 1 on a
  hydration mismatch.

```sh
npm install
npm run repro            # CHROME_BIN overrides the Chrome path (macOS default otherwise)
```

Variants:

- **3.6.0-rc.10**: replace every `3.6.0-rc.11` in `package.json` with `3.6.0-rc.10`, then `npm install && npm run repro`.
- **rc.11 with dccc57c's branch dropped**: `npm run repro:dropped` (`drop-dccc57c.mjs` rewrites the installed
  `@vue/server-renderer` dist, replacing
  `push ? slot(props, push, parent, scopeId) : [renderSlot({ [name]: slot }, name, props)]` with
  `slot(props, push, parent, scopeId)`).
- **Control, no dynamic component**: copy `List.no-dynamic-component.vue` over `List.vue`.

## Results (`results/`)

| variant | SSR inside `<ol>` | server | client console | verdict |
|---|---|---|---|---|
| 3.6.0-rc.10 | `<!--[--><li>…</li><!--]-->` | none | none | clean |
| 3.6.0-rc.11 | `<!--[--><!--[--><!--[--><li>…</li><!--]--><!--]--><!--]-->` | `[Vue warn]: <TransitionGroup> children must be keyed.` | `Hydration children mismatch on ol … at <VaporTransitionGroup>`; `Hydration completed but contains mismatches.` | mismatch |
| 3.6.0-rc.11, dccc57c's branch dropped | as rc.10 | none | none | clean |
| control (no `<component :is>`), rc.10 and rc.11 | `<!--[--><!--[--><li>…</li><!--]--><!--]-->` | none | none | clean |

Node v24.19.0, Chrome 155.0.8059.40, macOS arm64.
