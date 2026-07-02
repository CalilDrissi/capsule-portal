import { chromium } from 'playwright'
const APP = 'http://localhost:5180'
const out = []
const errs = []
const browser = await chromium.launch({ headless: false, channel: 'chrome', args: ['--no-sandbox'] })
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await ctx.newPage()
page.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 160)) })
page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message.slice(0, 160)))

async function step(name, fn) { try { const r = await fn(); out.push({ name, ok: r !== false, ...(typeof r === 'object' ? r : {}) }) } catch (e) { out.push({ name, ok: false, err: e.message.slice(0, 160) }) } }

// 1. Login
await page.goto(APP + '/login', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
await step('login page renders Carbon form', async () => {
  return { hasUser: await page.locator('#username').count() > 0, hasPass: await page.locator('#password').count() > 0, hasBtn: await page.getByRole('button', { name: /sign in/i }).count() > 0 }
})
await step('login with valid creds', async () => {
  await page.fill('#username', 'admin')
  await page.fill('#password', 'capsule-admin')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForTimeout(3000)
  return { url: page.url(), onDocuments: page.url().includes('/documents') }
})

// 2. Shell
await step('app shell renders (Header + SideNav)', async () => {
  return { header: await page.locator('.cds--header').count() > 0, brand: (await page.locator('.cds--header__name').innerText().catch(() => '')).includes('Capsule'), sidenav: await page.locator('.cds--side-nav').count() > 0 }
})

// 3. Documents list
await step('documents DataTable renders with the test doc', async () => {
  await page.waitForTimeout(1500)
  const rows = await page.locator('.cds--data-table tbody tr').count()
  const hasTestDoc = await page.getByText('Capsule Test Doc').count() > 0
  return { rows, hasTestDoc, hasTable: await page.locator('.cds--data-table').count() > 0 }
})

// 4. Row click -> detail + viewer
await step('click document row -> detail + page-image viewer', async () => {
  await page.locator('.cds--data-table tbody tr').first().click()
  await page.waitForTimeout(3500)
  const url = page.url()
  const hasImg = await page.locator('.capsule-viewer__img').count() > 0
  const imgVisible = hasImg && await page.locator('.capsule-viewer__img').isVisible()
  const hasMeta = await page.getByText('UUID').count() > 0
  return { url, detail: /documents\/\d+/.test(url), viewerImage: imgVisible, metadata: hasMeta }
})

// 5. Upload flow
await step('upload a new document end-to-end', async () => {
  await page.goto(APP + '/upload', { waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)
  const hasUploader = await page.locator('.cds--file-browse-btn, .cds--file__drop-container').count() > 0
  const hasDropdown = await page.locator('#doc-type').count() > 0
  // set file via the hidden input
  const fileInput = page.locator('input[type="file"]').first()
  await fileInput.setInputFiles({ name: 'capsule-e2e.txt', mimeType: 'text/plain', buffer: Buffer.from('e2e upload ' + Date.now()) })
  await page.waitForTimeout(800)
  // pick doc type
  await page.locator('#doc-type').click(); await page.waitForTimeout(500)
  await page.locator('.cds--list-box__menu-item').first().click().catch(() => {})
  await page.waitForTimeout(500)
  await page.getByRole('button', { name: /^upload$/i }).click()
  await page.waitForTimeout(4000)
  const backOnDocs = page.url().includes('/documents') && !page.url().includes('upload')
  return { hasUploader, hasDropdown, backOnDocs }
})

// 6. Theme toggle
await step('theme toggle switches g10<->g100', async () => {
  await page.goto(APP + '/documents', { waitUntil: 'networkidle' }); await page.waitForTimeout(1500)
  const themeClass = () => page.evaluate(() => {
    const el = document.querySelector('.capsule-content')?.querySelector('.cds--g10, .cds--g90, .cds--g100')
    return el ? [...el.classList].find((c) => c.startsWith('cds--g')) : 'none'
  })
  const before = await themeClass()
  await page.locator('[data-testid="theme-toggle"]').click()
  await page.waitForTimeout(900)
  const after = await themeClass()
  return { changed: before !== after, before, after }
})

await page.screenshot({ path: '/tmp/capsule-web-final.png' })
await browser.close()

console.log('\n===== FOUNDATION HEADED TEST =====')
for (const o of out) console.log(`  [${o.ok ? 'PASS' : 'FAIL'}] ${o.name} ${JSON.stringify(Object.fromEntries(Object.entries(o).filter(([k]) => !['name', 'ok'].includes(k))))}`)
console.log('\nCONSOLE ERRORS (' + [...new Set(errs)].length + '):')
;[...new Set(errs)].slice(0, 10).forEach(e => console.log('   -', e))
console.log('\nFOUNDATIONTESTDONE')
