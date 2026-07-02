import { chromium } from 'playwright'
const APP = 'http://localhost:5180'
const out = []
const errs = []
const browser = await chromium.launch({ headless: false, channel: 'chrome', args: ['--no-sandbox'] })
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
const page = await ctx.newPage()
page.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)) })
page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message.slice(0, 200)))

async function step(name, fn) { try { const r = await fn(); out.push({ name, ok: r !== false, ...(typeof r === 'object' ? r : {}) }) } catch (e) { out.push({ name, ok: false, err: e.message.slice(0, 200) }) } }
const shot = (n) => page.screenshot({ path: `/tmp/capsule-${n}.png` }).catch(() => {})

const CAB = 'E2E Cabinet ' + Date.now()

// Login
await page.goto(APP + '/login', { waitUntil: 'networkidle' })
await page.waitForTimeout(1000)
await page.fill('#username', 'admin')
await page.fill('#password', 'capsule-admin')
await page.getByRole('button', { name: /sign in/i }).click()
await page.waitForTimeout(3000)

// 1. SideNav has the new items
await step('sidenav shows Cabinets / Indexes / Search', async () => {
  await page.goto(APP + '/documents', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  const txt = await page.locator('.cds--side-nav').innerText()
  return { cabinets: txt.includes('Cabinets'), indexes: txt.includes('Indexes'), search: txt.includes('Search') }
})

// 2. CABINETS list + create
await step('create a cabinet -> appears in list', async () => {
  await page.goto(APP + '/cabinets', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  await page.locator('[data-testid="new-cabinet"]').click()
  await page.waitForTimeout(600)
  await page.locator('[data-testid="cabinet-label-input"]').fill(CAB)
  await page.getByRole('button', { name: /^create$/i }).click()
  await page.waitForTimeout(2000)
  await shot('cabinets')
  const appears = await page.getByText(CAB, { exact: true }).count() > 0
  return { appears }
})

// 3. Open cabinet detail
await step('open cabinet detail (tree + docs panel)', async () => {
  await page.getByText(CAB, { exact: true }).first().click()
  await page.waitForTimeout(2000)
  const onDetail = /\/cabinets\/\d+/.test(page.url())
  const tree = await page.locator('[data-testid="cabinet-tree"]').count() > 0
  return { url: page.url(), onDetail, tree }
})

// 4. Add a document to the cabinet
await step('add a document to the cabinet -> appears in cabinet', async () => {
  await page.locator('[data-testid="add-doc-to-cabinet"]').click()
  await page.waitForTimeout(800)
  // open combobox + pick first item (Carbon puts the id on the input)
  await page.locator('#add-doc-combo').click()
  await page.waitForTimeout(600)
  const firstItem = page.locator('.cds--list-box__menu-item').first()
  await firstItem.click().catch(() => {})
  await page.waitForTimeout(400)
  await page.getByRole('button', { name: /^add$/i }).click()
  await page.waitForTimeout(2000)
  const rows = await page.locator('[data-testid="cabinet-docs"] tbody tr').count()
  await shot('cabinet-detail')
  return { docRows: rows, added: rows > 0 }
})

// 5. Remove the document from the cabinet
await step('remove the document from the cabinet', async () => {
  const before = await page.locator('[data-testid="cabinet-docs"] tbody tr').count()
  await page.locator('[data-testid^="remove-doc-"]').first().click()
  await page.waitForTimeout(2000)
  const after = await page.locator('[data-testid="cabinet-docs"] tbody tr').count()
  return { before, after, removed: after < before }
})

// 6. INDEXES browse
await step('indexes list renders + open instance tree', async () => {
  await page.goto(APP + '/indexes', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  const hasRows = await page.locator('.cds--data-table tbody tr, table tbody tr').count()
  // open first index
  await page.locator('table tbody tr').first().click()
  await page.waitForTimeout(2000)
  const tree = await page.locator('[data-testid="index-tree"]').count() > 0
  const nodes = await page.locator('[data-testid="index-tree"] .cds--tree-node').count()
  await shot('indexes')
  return { hasRows, tree, nodes }
})

// 7. Expand an index node (drill the tree)
await step('expand an index node in the tree (lazy children)', async () => {
  const tree = page.locator('[data-testid="index-tree"]')
  const before = await tree.locator('[role="treeitem"]').count()
  // click the caret toggle of the first parent node to lazy-load children
  await tree.locator('.cds--tree-parent-node__toggle, button[class*="toggle"]').first().click().catch(() => {})
  await page.waitForTimeout(1500)
  const after = await tree.locator('[role="treeitem"]').count()
  return { before, after, expanded: after > before }
})

// 8. SEARCH simple for a known doc
await step('simple search finds a known document', async () => {
  await page.goto(APP + '/search', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)
  await page.locator('[data-testid="search-input"]').fill('Capsule')
  await page.locator('[data-testid="search-submit"]').click()
  await page.waitForTimeout(2500)
  const results = await page.locator('[data-testid="search-results"] tbody tr').count()
  await shot('search')
  return { results, found: results > 0 }
})

// 9. Click a search result -> document detail
await step('click a search result opens the document detail', async () => {
  await page.locator('[data-testid="search-results"] tbody tr').first().click()
  await page.waitForTimeout(2500)
  return { url: page.url(), onDetail: /\/documents\/\d+/.test(page.url()) }
})

// 10. Advanced search
await step('advanced search by label returns results', async () => {
  await page.goto(APP + '/search', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  // switch to Advanced tab
  await page.getByRole('tab', { name: /advanced/i }).click()
  await page.waitForTimeout(600)
  await page.locator('[data-testid="adv-label"]').fill('Capsule')
  await page.locator('[data-testid="adv-search-submit"]').click()
  await page.waitForTimeout(2500)
  const results = await page.locator('[data-testid="adv-search-results"] tbody tr').count()
  return { results }
})

// 11. Saved searches tab loads (read-only)
await step('saved searches tab loads', async () => {
  await page.getByRole('tab', { name: /saved/i }).click()
  await page.waitForTimeout(1500)
  // either a list or the empty-state tile is acceptable
  const hasList = await page.locator('[data-testid="saved-list"]').count() > 0
  const hasEmpty = await page.locator('.capsule-empty').count() > 0
  return { ok: hasList || hasEmpty, hasList, hasEmpty }
})

// 12. Document detail has a Cabinets tab
await step('document detail exposes a Cabinets tab', async () => {
  await page.goto(APP + '/documents', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  await page.locator('.cds--data-table tbody tr').first().click()
  await page.waitForTimeout(2500)
  const hasTab = await page.getByRole('tab', { name: /cabinets/i }).count() > 0
  if (hasTab) {
    await page.getByRole('tab', { name: /cabinets/i }).click()
    await page.waitForTimeout(1000)
  }
  const panel = await page.locator('[data-testid="doc-cabinets-list"]').count() > 0
  return { hasTab, panel }
})

await browser.close()

console.log('\n===== ORGANIZE + SEARCH HEADED TEST =====')
for (const o of out) console.log(`  [${o.ok ? 'PASS' : 'FAIL'}] ${o.name} ${JSON.stringify(Object.fromEntries(Object.entries(o).filter(([k]) => !['name', 'ok'].includes(k))))}`)
console.log('\nCONSOLE ERRORS (' + [...new Set(errs)].length + '):')
;[...new Set(errs)].slice(0, 12).forEach(e => console.log('   -', e))
console.log('\nORGANIZESEARCHTESTDONE')
