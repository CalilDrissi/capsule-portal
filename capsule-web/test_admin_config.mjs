import { chromium } from 'playwright'
const APP = 'http://localhost:5180'
const API = 'http://localhost:8800/api/v4'
const out = []
const errs = []

// token for cleanup
const tokRes = await fetch(`${API}/auth/token/obtain/`, {
  method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  body: JSON.stringify({ username: 'admin', password: 'capsule-admin' }),
})
const TOKEN = (await tokRes.json()).token
const H = { Authorization: `Token ${TOKEN}`, Accept: 'application/json' }

const b = await chromium.launch({ headless: false, channel: 'chrome', args: ['--no-sandbox'] })
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage()
p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 140)) })
p.on('pageerror', (e) => errs.push('PE: ' + e.message.slice(0, 140)))

async function step(name, fn) { try { const r = await fn(); out.push({ name, ok: r !== false, ...(typeof r === 'object' ? r : {}) }) } catch (e) { out.push({ name, ok: false, err: e.message.slice(0, 140) }) } }

await p.goto(APP + '/login', { waitUntil: 'networkidle' })
await p.fill('#username', 'admin'); await p.fill('#password', 'capsule-admin')
await p.getByRole('button', { name: /sign in/i }).click()
await p.waitForTimeout(2500)

async function createViaModal(path, fillName, value) {
  await p.goto(APP + path, { waitUntil: 'networkidle' }); await p.waitForTimeout(1500)
  await p.getByRole('button', { name: /^new$/i }).click(); await p.waitForTimeout(600)
  await p.fill(`#f-${fillName}`, value)
  await p.getByRole('button', { name: /^save$/i }).click(); await p.waitForTimeout(2000)
  return p.getByText(value, { exact: false }).count()
}

const stamp = Date.now() % 100000
await step('document types: create', async () => {
  const n = await createViaModal('/admin/document-types', 'label', 'E2EType' + stamp)
  return { appears: n > 0 }
})
await step('metadata types: create', async () => {
  // metadata type needs name + label
  await p.goto(APP + '/admin/metadata-types', { waitUntil: 'networkidle' }); await p.waitForTimeout(1500)
  await p.getByRole('button', { name: /^new$/i }).click(); await p.waitForTimeout(600)
  await p.fill('#f-name', 'e2e_meta' + stamp); await p.fill('#f-label', 'E2E Meta ' + stamp)
  await p.getByRole('button', { name: /^save$/i }).click(); await p.waitForTimeout(2000)
  return { appears: (await p.getByText('E2E Meta ' + stamp).count()) > 0 }
})
await step('events: list loads rows', async () => {
  await p.goto(APP + '/admin/events', { waitUntil: 'networkidle' }); await p.waitForTimeout(2500)
  return { rows: await p.locator('.cds--data-table tbody tr').count() }
})
await step('smart links: create', async () => {
  const n = await createViaModal('/admin/smart-links', 'label', 'E2ESmart' + stamp)
  return { appears: n > 0 }
})
await step('web links: create', async () => {
  await p.goto(APP + '/admin/web-links', { waitUntil: 'networkidle' }); await p.waitForTimeout(1500)
  await p.getByRole('button', { name: /^new$/i }).click(); await p.waitForTimeout(600)
  await p.fill('#f-label', 'E2EWeb' + stamp); await p.fill('#f-template', 'http://x/{{document.label}}')
  await p.getByRole('button', { name: /^save$/i }).click(); await p.waitForTimeout(2000)
  return { appears: (await p.getByText('E2EWeb' + stamp).count()) > 0 }
})
await step('settings: info note renders', async () => {
  await p.goto(APP + '/admin/settings', { waitUntil: 'networkidle' }); await p.waitForTimeout(1200)
  return { note: (await p.getByText(/not exposed over the REST API/i).count()) > 0 }
})

await p.screenshot({ path: '/tmp/capsule-admin2.png' })
await b.close()

// --- cleanup created entities via API ---
async function cleanup(listPath, match) {
  const r = await fetch(`${API}${listPath}?page_size=200`, { headers: H })
  const d = await r.json()
  for (const it of d.results || []) {
    const label = it.label || it.name || ''
    if (label.includes(String(stamp))) {
      await fetch(`${API}${listPath}${it.id}/`, { method: 'DELETE', headers: H })
    }
  }
}
await cleanup('/document_types/')
await cleanup('/metadata_types/')
await cleanup('/smart_links/')
await cleanup('/web_links/')

console.log('\n===== ADMIN-2 TEST =====')
for (const o of out) console.log(`  [${o.ok ? 'PASS' : 'FAIL'}] ${o.name} ${JSON.stringify(Object.fromEntries(Object.entries(o).filter(([k]) => !['name', 'ok'].includes(k))))}`)
console.log('console errors:', JSON.stringify([...new Set(errs)].slice(0, 6)))
console.log('cleaned up test entities (stamp ' + stamp + ')')
console.log('ADMIN2DONE')
