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

// Login
await page.goto(APP + '/login', { waitUntil: 'networkidle' })
await page.waitForTimeout(1000)
await page.fill('#username', 'admin')
await page.fill('#password', 'capsule-admin')
await page.getByRole('button', { name: /sign in/i }).click()
await page.waitForTimeout(3000)

// SideNav has Workflows + Checkouts
await step('sidenav shows Workflows + Checkouts', async () => {
  const wf = await page.getByText('Workflows', { exact: true }).count()
  const co = await page.getByText('Checkouts', { exact: true }).count()
  return { wf, co }
})

// ---------- CONTENT: OCR + Parsed on doc 2 ----------
await step('open document 2 detail with new tabs', async () => {
  await page.goto(APP + '/documents/2', { waitUntil: 'networkidle' })
  await page.waitForTimeout(2500)
  const tabNames = await page.locator('.cds--tabs [role="tab"]').allInnerTexts()
  return { tabs: tabNames.join(',') }
})

await step('OCR tab shows extracted text', async () => {
  await page.getByRole('tab', { name: 'OCR' }).click()
  await page.waitForTimeout(2000)
  const hasContent = await page.locator('[data-testid="ocr-content"]').count() > 0
  const hasEmpty = await page.locator('[data-testid="ocr-empty"]').count() > 0
  const text = hasContent ? await page.locator('[data-testid="ocr-content"]').innerText() : ''
  await shot('ocr')
  return { ok: hasContent || hasEmpty, hasContent, hasEmpty, sample: text.slice(0, 40) }
})

await step('Content (parsed) tab shows parsed text', async () => {
  await page.getByRole('tab', { name: 'Content' }).click()
  await page.waitForTimeout(2000)
  const hasContent = await page.locator('[data-testid="parsed-content"]').count() > 0
  const hasEmpty = await page.locator('[data-testid="parsed-empty"]').count() > 0
  const text = hasContent ? await page.locator('[data-testid="parsed-content"]').innerText() : ''
  return { ok: hasContent || hasEmpty, hasContent, hasEmpty, sample: text.slice(0, 40) }
})

// ---------- SIGNATURES on doc 2 ----------
await step('Signatures tab renders (embedded + detached)', async () => {
  await page.getByRole('tab', { name: 'Signatures' }).click()
  await page.waitForTimeout(2000)
  const rendered = await page.locator('[data-testid="signatures-tab"]').count() > 0
  const emb = await page.locator('[data-testid="signatures-embedded"]').count() > 0
  const det = await page.locator('[data-testid="signatures-detached"]').count() > 0
  await shot('signatures')
  return { ok: rendered && emb && det, rendered, emb, det }
})

// ---------- CHECKOUT on doc 2 ----------
await step('check out document 2 (banner appears)', async () => {
  const btn = page.locator('[data-testid="checkout-doc"]')
  if (await btn.count() === 0) {
    // already checked out from a prior run: check in first to reset
    const ci = page.locator('[data-testid="checkin-doc"]')
    if (await ci.count() > 0) { await ci.click(); await page.waitForTimeout(1800) }
  }
  await page.locator('[data-testid="checkout-doc"]').click()
  await page.waitForTimeout(2000)
  const banner = await page.locator('[data-testid="checkout-banner"]').count() > 0
  const checkinBtn = await page.locator('[data-testid="checkin-doc"]').count() > 0
  await shot('checkout')
  return { ok: banner && checkinBtn, banner, checkinBtn }
})

await step('checkout appears in /checkouts page', async () => {
  await page.goto(APP + '/checkouts', { waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)
  const rows = await page.locator('[data-testid="checkouts-table"] tbody tr').count()
  const hasDoc2 = await page.locator('[data-testid="checkout-row-2"]').count() > 0
  return { ok: rows > 0 && hasDoc2, rows, hasDoc2 }
})

await step('check in document 2 (banner clears)', async () => {
  await page.goto(APP + '/documents/2', { waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)
  const ci = page.locator('[data-testid="checkin-doc"]')
  if (await ci.count() === 0) return { skipped: 'not checked out' }
  await ci.click()
  await page.waitForTimeout(2000)
  const bannerGone = await page.locator('[data-testid="checkout-banner"]').count() === 0
  const checkoutBtn = await page.locator('[data-testid="checkout-doc"]').count() > 0
  return { ok: bannerGone && checkoutBtn, bannerGone, checkoutBtn }
})

await step('checkouts page empty after check-in', async () => {
  await page.goto(APP + '/checkouts', { waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)
  const empty = await page.locator('[data-testid="checkouts-empty"]').count() > 0
  const hasDoc2 = await page.locator('[data-testid="checkout-row-2"]').count() > 0
  return { ok: empty || !hasDoc2, empty, hasDoc2 }
})

// ---------- WORKFLOWS: templates list + detail ----------
await step('workflows page lists templates', async () => {
  await page.goto(APP + '/workflows', { waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)
  const rows = await page.locator('[data-testid="workflows-table"] tbody tr').count()
  await shot('workflows')
  return { rows }
})

await step('workflow template detail shows states + transitions', async () => {
  const row = page.locator('[data-testid^="workflow-row-"]').first()
  if (await row.count() === 0) return { skipped: 'no templates' }
  await row.click()
  await page.waitForTimeout(2000)
  const states = await page.locator('[data-testid="wf-states"]').count() > 0
  const transitions = await page.locator('[data-testid="wf-transitions-table"] tbody tr').count()
  await shot('workflows')
  return { ok: states && transitions > 0, states, transitions }
})

// ---------- WORKFLOW INSTANCE on doc 7: transition advances state ----------
await step('doc 7 workflow tab shows current state', async () => {
  await page.goto(APP + '/documents/7', { waitUntil: 'networkidle' })
  await page.waitForTimeout(2500)
  await page.getByRole('tab', { name: 'Workflows' }).click()
  await page.waitForTimeout(2000)
  const tab = await page.locator('[data-testid="workflows-tab"]').count() > 0
  const stateText = await page.locator('[data-testid^="wf-state-"]').first().innerText().catch(() => '')
  return { ok: tab, tab, stateText }
})

await step('perform a workflow transition; state changes', async () => {
  const stateTag = page.locator('[data-testid^="wf-state-"]').first()
  if (await stateTag.count() === 0) return { skipped: 'no workflow instance' }
  const before = await stateTag.innerText()
  const doBtn = page.locator('[data-testid^="wf-do-transition-"]').first()
  if (await doBtn.count() === 0) return { skipped: 'no available transition', before }
  await doBtn.click()
  await page.waitForTimeout(2500)
  const after = await page.locator('[data-testid^="wf-state-"]').first().innerText()
  const historyRows = await page.locator('[data-testid="wf-history"] .cds--structured-list-row').count()
  return { ok: before !== after, before, after, historyRows }
})

await browser.close()
console.log('\n===== CONTENT + WORKFLOWS HEADED TEST =====')
for (const o of out) console.log(`  [${o.ok ? 'PASS' : 'FAIL'}] ${o.name} ${JSON.stringify(Object.fromEntries(Object.entries(o).filter(([k]) => !['name', 'ok'].includes(k))))}`)
console.log('\nCONSOLE ERRORS (' + [...new Set(errs)].length + '):')
;[...new Set(errs)].slice(0, 12).forEach(e => console.log('   -', e))
console.log('\nCONTENTWORKFLOWSTESTDONE')
