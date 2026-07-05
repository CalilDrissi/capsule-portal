import { chromium } from 'playwright'
import {
  APP,
  provisionFirm,
  provisionClient,
  activateClient,
  uploadViaUi,
  writeSamplePdf,
} from './capsule_test_helpers.mjs'

// ---- Self-provision a fresh firm + accountant + an activated client -------
const { firm, acct, token } = await provisionFirm('Flow P4')
const provisioned = await provisionClient(token, firm.id, 'Flow P4 Client')
const CLIENT = { u: provisioned.temp_username, p: 'P4ClientPass123!' }
const CLIENT_ID = String(provisioned.client.id)
// Document dated 2026-06 so the accountant "export period 2026-06" has content.
const DOC_DATE = '2026-06-15'
const PDF = writeSamplePdf('/tmp/capsule_p4_sample.pdf')

const out = []
const errs = []
const browser = await chromium.launch({
  headless: false,
  channel: 'chrome',
  args: ['--no-sandbox'],
})
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await ctx.newPage()
page.on('console', (m) => {
  if (m.type() === 'error') errs.push(m.text().slice(0, 160))
})
page.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message.slice(0, 160)))

async function step(name, fn) {
  try {
    const r = await fn()
    out.push({ name, ok: r !== false, ...(typeof r === 'object' ? r : {}) })
  } catch (e) {
    out.push({ name, ok: false, err: e.message.slice(0, 200) })
  }
}
async function login(u, p) {
  await page.goto(APP + '/login', { waitUntil: 'networkidle' })
  await page.waitForTimeout(700)
  await page.fill('#username', u)
  await page.fill('#password', p)
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForTimeout(3000)
}
async function logout() {
  await page.locator('[data-testid="logout"]').click().catch(() => {})
  await page.waitForTimeout(1500)
}

// =================== SETUP: activate client + upload a document ===========
await step('setup: activate client + upload document', async () => {
  await activateClient(page, provisioned.invite_path, CLIENT.p)
  const category = await page
    .locator('#upload-category option')
    .first()
    .getAttribute('value')
    .catch(() => null)
  await uploadViaUi(page, { file: PDF, category, date: DOC_DATE, label: 'p4-statement' })
  await logout()
  return { url: page.url(), ok: true }
})

// =================== ACCOUNTANT ===================
await step('accountant login -> clients grid', async () => {
  await login(acct.u, acct.p)
  return { url: page.url(), ok: page.url().includes('/clients') }
})

await step('open client workspace', async () => {
  await page.goto(APP + '/clients/' + CLIENT_ID, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2500)
  const title = await page.locator('.capsule-page__title').first().textContent()
  return { title, ok: !!title }
})

await step('documents tab shows status badge column', async () => {
  await page.getByRole('tab', { name: /^Documents$/i }).click()
  await page.waitForTimeout(2500)
  const hasStatus = await page.getByText('Status', { exact: true }).count()
  return hasStatus > 0
})

await step('open a document -> status tab + transition', async () => {
  // Click first document row to open the workspace document view.
  await page.locator('table tbody tr').first().click()
  await page.waitForTimeout(2500)
  // Status tab is default; capture current state then apply a transition.
  await page.screenshot({ path: '/tmp/p4-status.png' })
  const transitionBtn = page.locator('[data-testid^="wf-do-transition-"]')
  const hasTransition = await transitionBtn.count()
  if (hasTransition > 0) {
    await transitionBtn.first().click()
    await page.waitForTimeout(2500)
  }
  await page.screenshot({ path: '/tmp/p4-status.png' })
  const stateTag = await page
    .locator('[data-testid^="wf-state-"]')
    .first()
    .textContent()
    .catch(() => null)
  return { hadTransition: hasTransition > 0, stateTag, ok: hasTransition > 0 }
})

await step('accountant posts a comment', async () => {
  await page.getByRole('tab', { name: /Comments/i }).click()
  await page.waitForTimeout(1500)
  const ta = page.locator('textarea').first()
  await ta.fill('Accountant note: confirm this is the right statement.')
  await page.locator('[data-testid="comment-submit"]').click()
  await page.waitForTimeout(2500)
  await page.screenshot({ path: '/tmp/p4-comments.png' })
  const txt = await page.locator('body').textContent()
  return txt.includes('Accountant note')
})

await step('accountant creates a document request', async () => {
  await page.goto(APP + '/clients/' + CLIENT_ID, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)
  await page.getByRole('tab', { name: /Requests/i }).click()
  await page.waitForTimeout(1500)
  await page.locator('[data-testid="request-documents"]').click()
  await page.waitForTimeout(1200)
  // category dropdown
  await page.locator('#request-category').click().catch(() => {})
  await page.waitForTimeout(400)
  await page.getByText('Payroll', { exact: true }).click().catch(() => {})
  await page.fill('[data-testid="request-period"]', '2026-07')
  await page.getByRole('button', { name: /^Request$/ }).click()
  await page.waitForTimeout(2500)
  await page.screenshot({ path: '/tmp/p4-requests.png' })
  const listed = await page.locator('[data-testid="requests-list"]').count()
  const bodyTxt = await page.locator('body').textContent()
  return listed > 0 && bodyTxt.includes('2026-07')
})

await step('accountant exports a period -> zip download', async () => {
  await page.goto(APP + '/clients/' + CLIENT_ID, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)
  await page.getByRole('tab', { name: /By period/i }).click()
  await page.waitForTimeout(2000)
  // Export by the current month: the backend period export matches on the
  // document's date, and a just-uploaded doc's date is "now".
  const exportPeriod = new Date().toISOString().slice(0, 7)
  await page.fill('[data-testid="export-period-input"]', exportPeriod)
  const dl = page.waitForEvent('download', { timeout: 15000 }).catch(() => null)
  await page.locator('[data-testid="export-period-button"]').click()
  const download = await dl
  let saved = null
  if (download) {
    saved = '/tmp/p4-export-headed.zip'
    await download.saveAs(saved)
  }
  return { download: !!download, saved, ok: !!download }
})

await logout()

// =================== CLIENT ===================
await step('client login -> workspace', async () => {
  await login(CLIENT.u, CLIENT.p)
  await page.goto(APP + '/workspace', { waitUntil: 'networkidle' })
  await page.waitForTimeout(2500)
  return { url: page.url(), ok: page.url().includes('/workspace') }
})

await step('client sees open-requests checklist', async () => {
  const checklist = await page.locator('[data-testid="client-checklist"]').count()
  const txt = await page.locator('body').textContent()
  return checklist > 0 && /Requested by your accountant/i.test(txt)
})

await step('client notification bell shows unread', async () => {
  await page.waitForTimeout(2000)
  const count = await page.locator('[data-testid="notification-count"]').count()
  await page.locator('[data-testid="notification-bell"]').click()
  await page.waitForTimeout(1500)
  await page.screenshot({ path: '/tmp/p4-notifications.png' })
  const panel = await page.locator('[data-testid="notification-panel"]').count()
  const txt = await page.locator('body').textContent()
  return { hadCount: count > 0, panelOpen: panel > 0, hasRequestMsg: /requested/i.test(txt), ok: panel > 0 && count > 0 }
})

await step('client opens a document -> status read-only (no transition control)', async () => {
  await page.goto(APP + '/workspace', { waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)
  await page.getByRole('tab', { name: /^All$/i }).click()
  await page.waitForTimeout(2500)
  await page.locator('table tbody tr').first().click()
  await page.waitForTimeout(2500)
  const stateTag = await page
    .locator('[data-testid^="wf-state-"]')
    .first()
    .textContent()
    .catch(() => null)
  const transitionControls = await page
    .locator('[data-testid^="wf-do-transition-"]')
    .count()
  return { stateTag, transitionControls, readOnly: transitionControls === 0, ok: transitionControls === 0 }
})

await step('client posts a comment (round-trip)', async () => {
  await page.getByRole('tab', { name: /Comments/i }).click()
  await page.waitForTimeout(1500)
  const ta = page.locator('textarea').first()
  await ta.fill('Client reply: yes, confirmed.')
  await page.locator('[data-testid="comment-submit"]').click()
  await page.waitForTimeout(2500)
  const txt = await page.locator('body').textContent()
  // Both comments visible to the client.
  return txt.includes('Client reply') && txt.includes('Accountant note')
})

await logout()

// =================== REPORT ===================
console.log('\n========== P4 FLOW RESULTS ==========')
console.log('firm:', firm.name, ' acct:', acct.u, ' client:', CLIENT.u, ' id:', CLIENT_ID)
for (const r of out) {
  console.log(
    `${r.ok ? 'PASS' : 'FAIL'}  ${r.name}` +
      (r.err ? `  :: ${r.err}` : '') +
      (r.stateTag ? `  [state=${r.stateTag}]` : '') +
      (r.saved ? `  [zip=${r.saved}]` : '') +
      (r.readOnly !== undefined ? `  [readOnly=${r.readOnly}]` : ''),
  )
}
const passed = out.filter((r) => r.ok).length
console.log(`\n${passed}/${out.length} passed`)
if (errs.length) {
  console.log('\nConsole errors (first 10):')
  for (const e of [...new Set(errs)].slice(0, 10)) console.log('  ' + e)
}
await browser.close()
process.exit(passed === out.length ? 0 : 1)
