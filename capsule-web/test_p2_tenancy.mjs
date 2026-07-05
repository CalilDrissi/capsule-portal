import { chromium } from 'playwright'
import {
  APP,
  provisionFirm,
  provisionClient,
} from './capsule_test_helpers.mjs'

// ---- Self-provision a fresh firm + accountant + a pending client ----------
// The pending client keeps its temporary credentials (must_change_password),
// which drives the first-login forced-change-password flow below.
const { token, firm, acct } = await provisionFirm('Tenancy P2')
const fresh = await provisionClient(token, firm.id, 'Fresh P2 Client')
const FRESH = { u: fresh.temp_username, p: fresh.temp_password }
const NEWPW = 'FreshClientPass123!'

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
  await page.waitForTimeout(800)
  await page.fill('#username', u); await page.fill('#password', p)
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForTimeout(3000)
}
async function logout() {
  await page.locator('[data-testid="logout"]').click().catch(() => {})
  await page.waitForTimeout(1500)
}

// 1. Accountant lands on /clients and sees client cards
await step('accountant login -> /clients', async () => {
  await login(acct.u, acct.p)
  return { url: page.url(), onClients: page.url().includes('/clients') }
})
await step('accountant sees client grid', async () => {
  await page.waitForTimeout(1200)
  const cards = await page.locator('[data-testid^="client-card-"]').count()
  const hasFresh = await page.getByText('Fresh P2 Client').count() > 0
  return { cards, hasFresh, hasGrid: await page.locator('[data-testid="clients-grid"]').count() > 0, ok: cards >= 1 && hasFresh }
})
await step('accountant header shows firm name', async () => {
  const headerName = await page.locator('.cds--header__name').innerText().catch(() => '')
  return { headerName, hasFirm: headerName.includes(firm.name), ok: headerName.includes(firm.name) }
})
await page.screenshot({ path: '/tmp/p2-clients-grid.png' })

// 2. Open a client workspace
await step('open client workspace', async () => {
  await page.locator('[data-testid^="client-card-"]').first().click()
  await page.waitForTimeout(2500)
  const onWorkspace = /\/clients\/\d+/.test(page.url())
  const hasTabs = await page.getByRole('tab', { name: /Documents/i }).count() > 0
  const hasBreadcrumb = await page.locator('.cds--breadcrumb').count() > 0
  return { url: page.url(), onWorkspace, hasTabs, hasBreadcrumb, ok: onWorkspace && hasTabs }
})
await page.screenshot({ path: '/tmp/p2-client-workspace.png' })

// 3. New-client modal shows a one-time invite link (temp creds behind details)
await step('new-client modal returns invite link + temp creds', async () => {
  await page.goto(APP + '/clients', { waitUntil: 'networkidle' }); await page.waitForTimeout(1200)
  await page.locator('[data-testid="new-client"]').click(); await page.waitForTimeout(600)
  await page.fill('#client-display-name', 'Modal Test ' + (Date.now() % 100000))
  await page.getByRole('button', { name: /^create$/i }).click(); await page.waitForTimeout(2500)
  const inviteLink = (await page.locator('[data-testid="invite-link"]').innerText().catch(() => '')).trim()
  const hasInvite = /\/invite\//.test(inviteLink)
  // Temp credentials are collapsed behind a <details> — expand to reveal them.
  await page.locator('summary', { hasText: /temporary credentials/i }).click().catch(() => {})
  await page.waitForTimeout(400)
  const u = await page.locator('[data-testid="temp-username"]').innerText().catch(() => '')
  const p = await page.locator('[data-testid="temp-password"]').innerText().catch(() => '')
  await page.getByRole('button', { name: /^done$/i }).click().catch(() => {})
  return { hasInvite, tempUser: u.trim(), hasPass: p.trim().length > 0, ok: hasInvite && u.trim().length > 0 && p.trim().length > 0 }
})

await logout()

// 4. Client first login (with temp creds) -> forced change-password
await step('client login forced to change-password', async () => {
  await login(FRESH.u, FRESH.p)
  return { url: page.url(), onChangePw: page.url().includes('/change-password'), hasField: await page.locator('#new-password').count() > 0, ok: page.url().includes('/change-password') }
})
await page.screenshot({ path: '/tmp/p2-change-password.png' })

// 5. Change the password -> lands on /workspace
await step('change password -> lands on /workspace', async () => {
  await page.fill('#new-password', NEWPW)
  await page.fill('#confirm-password', NEWPW)
  await page.getByRole('button', { name: /set password/i }).click()
  await page.waitForTimeout(3000)
  return { url: page.url(), onWorkspace: page.url().includes('/workspace'), ok: page.url().includes('/workspace') }
})

// 6. Client workspace + upload access
await step('client workspace renders (my documents)', async () => {
  await page.waitForTimeout(1500)
  const title = await page.locator('.capsule-page__title').first().innerText().catch(() => '')
  const hasUploadBtn = await page.locator('[data-testid="workspace-upload"]').count() > 0
  const sidenav = await page.getByText('My documents').count() > 0
  return { title, hasUploadBtn, sidenav, ok: hasUploadBtn }
})
await page.screenshot({ path: '/tmp/p2-client-workspace-self.png' })

await step('client can open upload page', async () => {
  await page.locator('[data-testid="workspace-upload"]').click()
  await page.waitForTimeout(2000)
  const onUpload = page.url().includes('/workspace/upload')
  const hasUploader = await page.locator('.cds--file__drop-container, .cds--file-browse-btn').count() > 0
  const hasCategory = await page.locator('#upload-category').count() > 0
  const hasDate = await page.locator('#upload-document-date').count() > 0
  return { onUpload, hasUploader, hasCategory, hasDate, ok: onUpload && hasCategory && hasDate }
})

// 7. Client cannot reach an accountant route (guard redirect)
await step('client blocked from /clients (guard)', async () => {
  await page.goto(APP + '/clients', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  return { url: page.url(), redirected: !page.url().includes('/clients') || page.url().includes('/workspace'), ok: !page.url().endsWith('/clients') }
})

await browser.close()
console.log('\n===== PHASE 2 TENANCY HEADED TEST =====')
console.log('firm:', firm.name, ' acct:', acct.u, ' fresh client:', FRESH.u)
let pass = 0, fail = 0
for (const o of out) { if (o.ok) pass++; else fail++; console.log(`  [${o.ok ? 'PASS' : 'FAIL'}] ${o.name} ${JSON.stringify(Object.fromEntries(Object.entries(o).filter(([k]) => !['name', 'ok'].includes(k))))}`) }
console.log(`\n  ${pass} passed, ${fail} failed`)
console.log('\nCONSOLE ERRORS (' + [...new Set(errs)].length + '):')
;[...new Set(errs)].slice(0, 10).forEach(e => console.log('   -', e))
console.log('\nP2TENANCYDONE')
process.exit(fail === 0 ? 0 : 1)
