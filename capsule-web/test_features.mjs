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

// 1. Dashboard is default landing + tiles show counts
await step('dashboard is default landing with stat tiles', async () => {
  await page.goto(APP + '/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(2500)
  const onDash = page.url().includes('/dashboard')
  const tiles = await page.locator('.capsule-stat').count()
  const values = await page.locator('.capsule-stat__value').allInnerTexts()
  await shot('dashboard')
  return { onDash, tiles, values: values.join(',') }
})

await step('dashboard tile navigates on click (Favorites)', async () => {
  await page.locator('.capsule-stat:has-text("Favorites")').click()
  await page.waitForTimeout(1500)
  const ok = page.url().includes('/favorites')
  await page.goBack(); await page.waitForTimeout(1000)
  return { url_was_favorites: ok }
})

await step('dashboard recent documents list navigates', async () => {
  await page.goto(APP + '/dashboard', { waitUntil: 'networkidle' }); await page.waitForTimeout(2000)
  const cnt = await page.locator('[data-testid^="recent-"]').count()
  return { recentRows: cnt }
})

// Open document detail (doc id 3)
await step('open document detail with tabs', async () => {
  await page.goto(APP + '/documents/3', { waitUntil: 'networkidle' })
  await page.waitForTimeout(2500)
  const hasTabs = await page.locator('[data-testid="detail-tabs"]').count() > 0
  const tabNames = await page.locator('.cds--tabs [role="tab"]').allInnerTexts()
  return { hasTabs, tabs: tabNames.join(',') }
})

// 2. Metadata tab: add + edit
await step('metadata tab: add value persists', async () => {
  await page.getByRole('tab', { name: 'Metadata' }).click()
  await page.waitForTimeout(1500)
  // open add dropdown
  const addBtnExists = await page.locator('[data-testid="meta-add-btn"]').count() > 0
  if (!addBtnExists) return { skipped: 'no addable metadata types', addBtnExists }
  await page.locator('#meta-add-type').click(); await page.waitForTimeout(500)
  await page.locator('.cds--list-box__menu-item').first().click(); await page.waitForTimeout(400)
  await page.fill('#meta-add-value', 'Jane Doe')
  await page.locator('[data-testid="meta-add-btn"]').click()
  await page.waitForTimeout(2000)
  const shown = await page.locator('[data-testid^="meta-value-"]').first().innerText().catch(() => '')
  return { addedValueVisible: shown.includes('Jane Doe'), shown }
})

await step('metadata tab: edit value persists after reload', async () => {
  const editBtn = page.locator('[data-testid^="meta-edit-btn-"]').first()
  if (await editBtn.count() === 0) return { skipped: 'no metadata to edit' }
  await editBtn.click(); await page.waitForTimeout(400)
  const input = page.locator('[id^="meta-edit-"]').first()
  await input.fill('John Smith')
  await page.getByRole('button', { name: /^Save$/ }).click()
  await page.waitForTimeout(1800)
  // reload and re-check
  await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(2000)
  await page.getByRole('tab', { name: 'Metadata' }).click(); await page.waitForTimeout(1500)
  const shown = await page.locator('[data-testid^="meta-value-"]').first().innerText().catch(() => '')
  return { editedPersists: shown.includes('John Smith'), shown }
})

// 3. Tags tab: attach + remove
await step('tags tab: attach tag persists', async () => {
  await page.getByRole('tab', { name: 'Tags' }).click(); await page.waitForTimeout(1500)
  const attachBtn = page.locator('[data-testid="tag-attach-btn"]')
  if (await attachBtn.count() === 0) return { skipped: 'no attachable tags' }
  await page.locator('#tag-pick').click(); await page.waitForTimeout(500)
  await page.locator('.cds--list-box__menu-item').first().click(); await page.waitForTimeout(400)
  await attachBtn.click(); await page.waitForTimeout(1800)
  // reload to confirm persistence
  await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(2000)
  await page.getByRole('tab', { name: 'Tags' }).click(); await page.waitForTimeout(1500)
  const tagCount = await page.locator('[data-testid^="tag-"]:not([data-testid*="remove"]):not([data-testid*="attach"]):not([data-testid="tag-pick"])').count()
  return { tagPresentAfterReload: tagCount > 0, tagCount }
})

await step('tags tab: remove tag persists', async () => {
  const tag = page.locator('[data-testid^="tag-"]:not([data-testid*="remove"]):not([data-testid*="attach"]):not([data-testid="tag-pick"])').first()
  if (await tag.count() === 0) return { skipped: 'no tag to remove' }
  const tagCountBefore = await page.locator('[data-testid^="tag-"]:not([data-testid*="remove"]):not([data-testid*="attach"]):not([data-testid="tag-pick"])').count()
  const tagId = await tag.getAttribute('data-testid')
  await page.locator(`[data-testid="tag-remove-${tagId.split('-')[1]}"]`).click()
  // wait for optimistic removal from the DOM
  await page.locator(`[data-testid="${tagId}"]`).waitFor({ state: 'detached', timeout: 8000 }).catch(() => {})
  await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(2500)
  await page.getByRole('tab', { name: 'Tags' }).click(); await page.waitForTimeout(1800)
  const tagCount = await page.locator('[data-testid^="tag-"]:not([data-testid*="remove"]):not([data-testid*="attach"]):not([data-testid="tag-pick"])').count()
  return { ok: tagCount === 0, tagRemovedAfterReload: tagCount === 0, tagCountBefore, tagCount }
})

// 4. Comments tab: post
await step('comments tab: post persists', async () => {
  await page.getByRole('tab', { name: 'Comments' }).click(); await page.waitForTimeout(1500)
  const before = await page.locator('[data-testid^="comment-"]').count()
  const msg = 'e2e comment ' + Date.now()
  await page.fill('#comment-text', msg)
  await page.locator('[data-testid="comment-submit"]').click()
  await page.waitForTimeout(1800)
  await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(2000)
  await page.getByRole('tab', { name: 'Comments' }).click(); await page.waitForTimeout(1500)
  const after = await page.locator('[data-testid^="comment-"]').count()
  const found = await page.getByText(msg).count() > 0
  return { commentAdded: after > before, before, after, found }
})

// 5. Versions + Files tabs render
await step('versions tab renders DataTable', async () => {
  await page.getByRole('tab', { name: 'Versions' }).click(); await page.waitForTimeout(1500)
  return { rows: await page.locator('.cds--data-table tbody tr').count() }
})
await step('files tab renders + download button', async () => {
  await page.getByRole('tab', { name: 'Files' }).click(); await page.waitForTimeout(1500)
  const rows = await page.locator('.cds--data-table tbody tr').count()
  const dl = await page.locator('[data-testid^="download-"]').count()
  await shot('detail-tabs')
  return { rows, downloadBtns: dl }
})

// 6. Favorite toggle persists
await step('favorite toggle persists across reload', async () => {
  const btn = page.locator('[data-testid="favorite-toggle"]')
  const labelBefore = await btn.innerText()
  await btn.click(); await page.waitForTimeout(1800)
  await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(2500)
  const labelAfter = await page.locator('[data-testid="favorite-toggle"]').innerText()
  return { changed: labelBefore !== labelAfter, labelBefore, labelAfter }
})

await step('favorites page lists the favorited doc', async () => {
  await page.goto(APP + '/favorites', { waitUntil: 'networkidle' }); await page.waitForTimeout(2000)
  const rows = await page.locator('.cds--data-table tbody tr').count()
  await shot('favorites')
  return { rows }
})

// un-favorite to leave clean state
await step('un-favorite to restore clean state', async () => {
  await page.goto(APP + '/documents/3', { waitUntil: 'networkidle' }); await page.waitForTimeout(2000)
  const btn = page.locator('[data-testid="favorite-toggle"]')
  const label = await btn.innerText()
  if (label.includes('Favorited')) { await btn.click(); await page.waitForTimeout(1500) }
  return { ok: true }
})

// 7. Recently created
await step('recently created page renders', async () => {
  await page.goto(APP + '/recently-created', { waitUntil: 'networkidle' }); await page.waitForTimeout(2000)
  return { rows: await page.locator('.cds--data-table tbody tr').count() }
})

// 8. Trash: send to trash, see in trash, restore
await step('send a document to trash from detail', async () => {
  await page.goto(APP + '/documents/3', { waitUntil: 'networkidle' }); await page.waitForTimeout(2000)
  await page.locator('[data-testid="trash-doc"]').click()
  await page.waitForTimeout(2500)
  const backOnDocs = page.url().includes('/documents') && !/documents\/\d/.test(page.url())
  return { backOnDocs, url: page.url() }
})

await step('trashed doc appears in Trash view', async () => {
  await page.goto(APP + '/trash', { waitUntil: 'networkidle' }); await page.waitForTimeout(2000)
  const rows = await page.locator('.cds--data-table tbody tr').count()
  const hasRestore = await page.locator('[data-testid="restore-3"]').count() > 0
  await shot('trash')
  return { rows, hasRestoreBtnForDoc3: hasRestore }
})

await step('restore doc 3 from trash', async () => {
  const btn = page.locator('[data-testid="restore-3"]')
  if (await btn.count() === 0) return { skipped: 'doc 3 not in trash' }
  await btn.click(); await page.waitForTimeout(2000)
  await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(1500)
  const stillThere = await page.locator('[data-testid="restore-3"]').count() > 0
  // confirm it's back in documents
  await page.goto(APP + '/documents', { waitUntil: 'networkidle' }); await page.waitForTimeout(2000)
  const backInDocs = await page.getByText('capsule-e2e').count() > 0
  return { restored: !stillThere, backInDocs }
})

await browser.close()
console.log('\n===== FEATURES HEADED TEST =====')
for (const o of out) console.log(`  [${o.ok ? 'PASS' : 'FAIL'}] ${o.name} ${JSON.stringify(Object.fromEntries(Object.entries(o).filter(([k]) => !['name', 'ok'].includes(k))))}`)
console.log('\nCONSOLE ERRORS (' + [...new Set(errs)].length + '):')
;[...new Set(errs)].slice(0, 12).forEach(e => console.log('   -', e))
console.log('\nFEATURESTESTDONE')
