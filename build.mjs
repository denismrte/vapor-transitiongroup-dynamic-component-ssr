// Compiles List.vue twice, as Vite's plugin-vue does for an SSR build and a client build: the server module (SSR codegen)
// and the client module (Vapor codegen). Writes out/List.ssr.mjs and out/List.client.mjs.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { parse, compileScript } from '@vue/compiler-sfc'
const { descriptor } = parse(readFileSync('List.vue', 'utf8'), { filename: 'List.vue' })
mkdirSync('out', { recursive: true })
for (const [ssr, file] of [[true, 'out/List.ssr.mjs'], [false, 'out/List.client.mjs']]) {
  const { content } = compileScript(descriptor, { id: 'list', inlineTemplate: true, templateOptions: { ssr, ssrCssVars: [] }, isProd: false })
  writeFileSync(file, content)
}
console.log('compiled with @vue/compiler-sfc ' + JSON.parse(readFileSync('node_modules/@vue/compiler-sfc/package.json', 'utf8')).version)
