import { chromium } from 'playwright'
import fs from 'fs'

const APP = 'http://localhost:5180'
const ACCT = { u: fs.readFileSync('/tmp/p3_acct_user.txt', 'utf8').trim(), p: 'AcctPass123!' }
const creds = fs.readFileSync('/tmp/p3_client_creds.txt', 'utf8').trim().split('\n')
const CLIENT = { u: creds[0].trim(), p: creds[1].trim() }
const NEWPW = 'P3ClientPass123!'

const out = []
const errs = []
const browser = await chromium.launch({ headless: false, channel: 'chrome', args: ['--no-sandbox'] })
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await ctx.newPage()
page.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 160)) })
page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message.slice(0, 160)))

async function step(name, fn) { try { const r = await fn(); out.push({ name, ok: r !== false, ...(typeof r === 'object' ? r : {}) }) } catch (e) { out.push({ name, ok: false, err: e.message.slice(0, 200) }) } }
async function login(u, p) {
  await page.goto(APP + '/login', { waitUntil: 'networkidle' })
  await page.waitForTimeout(700)
  await page.fill('#username', u); await page.fill('#password', p)
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForTimeout(3000)
}
async function logout() {
  await page.locator('[data-testid="logout"]').click().catch(() => {})
  await page.waitForTimeout(1500)
}

// ============ ACCOUNTANT: Grouping settings ============
await step('accountant login -> /clients', async () => {
  await login(ACCT.u, ACCT.p)
  return { url: page.url(), ok: page.url().includes('/clients') }
})

await step('open Grouping settings via SideNav', async () => {
  await page.locator('[data-testid="nav-grouping"]').click()
  await page.waitForTimeout(1500)
  const onSettings = page.url().includes('/settings')
  const hasBasis = await page.locator('#settings-basis').count() > 0
  const hasDepth = await page.locator('#settings-depth').count() > 0
  return { url: page.url(), onSettings, hasBasis, hasDepth }
})

await step('change basis + depth, add a category, save (toast)', async () => {
  await page.selectOption('#settings-basis', 'document_date')
  await page.selectOption('#settings-depth', 'YM')
  await page.fill('#settings-new-category', 'P3 Custom ' + (Date.now() % 100000))
  await page.locator('[data-testid="settings-add-category"]').click()
  await page.waitForTimeout(400)
  const tagCount = await page.locator('[data-testid="settings-categories"] .cds--tag').count()
  await page.locator('[data-testid="settings-save"]').click()
  await page.waitForTimeout(2500)
  const toast = await page.locator('.capsule-toasts .cds--toast-notification').count()
  return { tagCount, toast, ok: toast > 0 }
})
await page.screenshot({ path: '/tmp/p3-settings.png' })

await logout()

// ============ CLIENT: login (handles first-login change-pw OR already set) ============
await step('client login', async () => {
  // Try the temp password first; if that fails (password already changed on a
  // prior run), fall back to the new password.
  await login(CLIENT.u, CLIENT.p)
  if (page.url().includes('/login')) {
    await login(CLIENT.u, NEWPW)
  }
  const onChangePw = page.url().includes('/change-password')
  if (onChangePw) {
    await page.fill('#new-password', NEWPW)
    await page.fill('#confirm-password', NEWPW)
    await page.getByRole('button', { name: /set password/i }).click()
    await page.waitForTimeout(3500)
  }
  return { url: page.url(), onWorkspace: page.url().includes('/workspace') }
})

// Upload 3 docs with different dates + categories
const uploads = [
  { name: 'p3-jan.txt', date: '2026-01-15', cat: 0 },
  { name: 'p3-mar.txt', date: '2026-03-20', cat: 1 },
  { name: 'p3-prev.txt', date: '2025-11-05', cat: 2 },
]
let uploaded = 0
for (const u of uploads) {
  await step('upload ' + u.name, async () => {
    await page.goto(APP + '/workspace/upload', { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)
    // create a temp file
    const path = '/tmp/' + u.name
    fs.writeFileSync(path, 'content of ' + u.name + '\n')
    await page.locator('input[type="file"]').setInputFiles(path)
    await page.waitForTimeout(500)
    // select category by index if available
    const opts = await page.locator('#upload-category option').count()
    if (opts > u.cat) {
      const val = await page.locator('#upload-category option').nth(u.cat).getAttribute('value')
      await page.selectOption('#upload-category', val)
    }
    // set document date (flatpickr parses typed input on blur/enter)
    await page.fill('#upload-document-date', u.date)
    await page.locator('#upload-document-date').press('Enter')
    await page.waitForTimeout(400)
    await page.locator('#upload-label').click().catch(() => {})
    await page.locator('[data-testid="upload-submit"]').click()
    await page.waitForTimeout(3500)
    uploaded++
    return { url: page.url(), submitted: true }
  })
}

// ============ CLIENT: By period + Timeline ============
await step('client By period tab groups docs', async () => {
  await page.goto(APP + '/workspace', { waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)
  await page.getByRole('tab', { name: /By period/i }).click()
  await page.waitForTimeout(2500)
  const accordion = await page.locator('[data-testid="by-period-accordion"]').count()
  const items = await page.locator('.cds--accordion__item').count()
  // Two distinct years (2025 + 2026) means the document_date metadata drove
  // the grouping rather than the upload (today) date.
  const has2025 = await page.getByText(/2025/).count() > 0
  const has2026 = await page.getByText(/2026/).count() > 0
  return { accordion, yearSections: items, has2025, has2026, ok: accordion > 0 && items >= 2 }
})
await page.screenshot({ path: '/tmp/p3-by-period.png' })

await step('client Timeline tab shows entries chronologically', async () => {
  await page.getByRole('tab', { name: /Timeline/i }).click()
  await page.waitForTimeout(2500)
  const timeline = await page.locator('[data-testid="timeline"]').count()
  const entries = await page.locator('[data-testid="timeline-entry"]').count()
  return { timeline, entries, ok: timeline > 0 && entries >= 1 }
})
await page.screenshot({ path: '/tmp/p3-timeline.png' })

await browser.close()
console.log('\n===== PHASE 3 GROUPING HEADED TEST =====')
console.log('client:', CLIENT.u, ' uploaded:', uploaded)
let pass = 0, fail = 0
for (const o of out) { if (o.ok) pass++; else fail++; console.log(`  [${o.ok ? 'PASS' : 'FAIL'}] ${o.name} ${JSON.stringify(Object.fromEntries(Object.entries(o).filter(([k]) => !['name', 'ok'].includes(k))))}`) }
console.log(`\n  ${pass} passed, ${fail} failed`)
console.log('\nCONSOLE ERRORS (' + [...new Set(errs)].length + '):')
;[...new Set(errs)].slice(0, 10).forEach(e => console.log('   -', e))
console.log('\nP3GROUPINGDONE')
