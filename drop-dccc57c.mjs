// Drops the branch vuejs/core@dccc57cc added to renderComponentVNode from the installed @vue/server-renderer dist:
// `push ? slot(props, push, parent, scopeId) : [renderSlot(…)]` → `slot(props, push, parent, scopeId)`. Run after npm install.
import { readFileSync, writeFileSync, readdirSync, rmSync } from 'node:fs'
const dir = 'node_modules/@vue/server-renderer/dist/'
const forms = ['push ? slot(props, push, parent, scopeId) : [renderSlot({ [name]: slot }, name, props)]', 'push ? slot(props, push, parent, scopeId) : [(0, _vue_runtime_dom.renderSlot)({ [name]: slot }, name, props)]']
for (const f of readdirSync(dir).filter((f) => f.endsWith('.js'))) {
  let s = readFileSync(dir + f, 'utf8'), n = 0
  for (const a of forms) { n += s.split(a).length - 1; s = s.split(a).join('slot(props, push, parent, scopeId)') }
  if (n) { rmSync(dir + f); writeFileSync(dir + f, s); console.log(f + ': ' + n) }
}
