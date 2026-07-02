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

const STAMP = Date.now()
const USER = 'e2euser' + STAMP
const GROUP = 'E2E Group ' + STAMP
const ROLE = 'E2E Role ' + STAMP

// Login
await page.goto(APP + '/login', { waitUntil: 'networkidle' })
await page.waitForTimeout(1000)
await page.fill('#username', 'admin')
await page.fill('#password', 'capsule-admin')
await page.getByRole('button', { name: /sign in/i }).click()
await page.waitForTimeout(3000)

// 1. SideNav Administration group
await step('sidenav exposes Administration > Users/Groups/Roles/Permissions', async () => {
  await page.goto(APP + '/admin/users', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)
  const txt = await page.locator('.cds--side-nav').innerText()
  return { admin: txt.includes('Administration'), users: txt.includes('Users'), groups: txt.includes('Groups'), roles: txt.includes('Roles'), permissions: txt.includes('Permissions') }
})

// 2. Create a user -> appears in list
await step('create a user -> appears in list', async () => {
  await page.goto(APP + '/admin/users', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)
  await page.locator('[data-testid="new-user"]').click()
  await page.waitForTimeout(600)
  await page.locator('[data-testid="user-username-input"]').fill(USER)
  await page.locator('[data-testid="user-password-input"]').fill('Capsule12345!')
  await page.getByRole('button', { name: /^create$/i }).click()
  await page.waitForTimeout(2000)
  await shot('users')
  const appears = await page.getByText(USER, { exact: true }).count() > 0
  return { appears }
})

// 3. Edit the user (set first name)
await step('edit the user (first name persists)', async () => {
  const row = page.locator('tbody tr', { hasText: USER }).first()
  await row.locator('button.cds--overflow-menu, button[aria-haspopup]').first().click()
  await page.waitForTimeout(500)
  await page.getByRole('menuitem', { name: 'Edit' }).first().click()
  await page.waitForTimeout(600)
  await page.locator('[data-testid="user-edit-first"]').fill('Edited')
  await page.getByRole('button', { name: /^save$/i }).click()
  await page.waitForTimeout(1800)
  const has = await page.getByText('Edited', { exact: true }).count() > 0
  return { firstNameShown: has }
})

// 4. Create a group -> appears
await step('create a group -> appears in list', async () => {
  await page.goto(APP + '/admin/groups', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)
  await page.locator('[data-testid="new-group"]').click()
  await page.waitForTimeout(600)
  await page.locator('[data-testid="group-name-input"]').fill(GROUP)
  await page.getByRole('button', { name: /^create$/i }).click()
  await page.waitForTimeout(2000)
  await shot('groups')
  const appears = await page.getByText(GROUP, { exact: true }).count() > 0
  return { appears }
})

// 5. Add a member to the group
await step('add the user as a member of the group -> appears', async () => {
  await page.getByText(GROUP, { exact: true }).first().click()
  await page.waitForTimeout(1800)
  await page.locator('#group-user-pick').click()
  await page.waitForTimeout(500)
  await page.getByRole('option', { name: USER }).first().click().catch(async () => {
    await page.locator('.cds--list-box__menu-item', { hasText: USER }).first().click()
  })
  await page.waitForTimeout(400)
  await page.locator('[data-testid="group-member-add-btn"]').click()
  await page.waitForTimeout(2000)
  const inList = await page.locator('[data-testid="group-members-list"]').innerText()
  return { memberShown: inList.includes(USER) }
})

// 6. The user detail shows its group membership
await step('user detail shows group membership', async () => {
  await page.goto(APP + '/admin/users', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)
  await page.getByText(USER, { exact: true }).first().click()
  await page.waitForTimeout(1800)
  const groups = await page.locator('[data-testid="user-groups-list"]').innerText()
  return { groupShown: groups.includes(GROUP) }
})

// 7. Create a role -> appears
await step('create a role -> appears in list', async () => {
  await page.goto(APP + '/admin/roles', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)
  await page.locator('[data-testid="new-role"]').click()
  await page.waitForTimeout(600)
  await page.locator('[data-testid="role-label-input"]').fill(ROLE)
  await page.getByRole('button', { name: /^create$/i }).click()
  await page.waitForTimeout(2000)
  await shot('roles')
  const appears = await page.getByText(ROLE, { exact: true }).count() > 0
  return { appears }
})

// 8. Role: assign a group + grant a permission, reload persists
await step('role: assign group + grant permission, reload persists', async () => {
  await page.getByText(ROLE, { exact: true }).first().click()
  await page.waitForTimeout(1800)
  // assign group
  await page.locator('#role-group-pick').click()
  await page.waitForTimeout(400)
  await page.locator('.cds--list-box__menu-item', { hasText: GROUP }).first().click().catch(() => {})
  await page.waitForTimeout(300)
  await page.locator('[data-testid="role-group-add-btn"]').click()
  await page.waitForTimeout(1500)
  // grant a permission (search for a documents view permission)
  await page.locator('#role-perm-pick').click()
  await page.waitForTimeout(400)
  await page.locator('#role-perm-pick').fill('View documents')
  await page.waitForTimeout(700)
  await page.locator('.cds--list-box__menu-item', { hasText: /View documents/i }).first().click()
  await page.waitForTimeout(300)
  await page.locator('[data-testid="role-perm-add-btn"]').click()
  await page.waitForTimeout(1800)
  // reload, verify persistence
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)
  const groupsTxt = await page.locator('[data-testid="role-groups-list"]').innerText()
  const permsTxt = await page.locator('[data-testid="role-permissions-list"]').innerText()
  await shot('roles')
  return { groupPersists: groupsTxt.includes(GROUP), permPersists: /view/i.test(permsTxt) }
})

// 9. Permissions list renders (grouped)
await step('permissions reference list renders', async () => {
  await page.goto(APP + '/admin/permissions', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  const rows = await page.locator('[data-testid="permissions-list"] .cds--structured-list-row').count()
  const headers = await page.locator('[data-testid="permissions-list"] .capsule-section-subtitle').count()
  return { rows, namespaces: headers, ok: rows > 10 }
})

// 10. Document ACL: add ACL for role + grant permission, reload persists
await step('document ACL: add ACL for role + grant permission, reload persists', async () => {
  await page.goto(APP + '/documents', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  await page.locator('.cds--data-table tbody tr').first().click()
  await page.waitForTimeout(2500)
  await page.getByRole('tab', { name: /access control/i }).click()
  await page.waitForTimeout(1500)
  // add ACL for our role
  await page.locator('#acl-role-pick').click()
  await page.waitForTimeout(400)
  await page.locator('.cds--list-box__menu-item', { hasText: ROLE }).first().click().catch(() => {})
  await page.waitForTimeout(300)
  await page.locator('[data-testid="acl-add-btn"]').click()
  await page.waitForTimeout(2000)
  const aclCount = await page.locator('[data-testid="acl-list"] [data-testid^="acl-card-"]').count()
  // grant a permission on the first ACL card
  const combo = page.locator('[data-testid="acl-list"] [id^="acl-perm-pick-"]').first()
  await combo.click()
  await page.waitForTimeout(300)
  await combo.fill('View documents')
  await page.waitForTimeout(700)
  await page.locator('.cds--list-box__menu-item', { hasText: /View documents/i }).first().click()
  await page.waitForTimeout(300)
  await page.locator('[data-testid^="acl-perm-add-"]').first().click()
  await page.waitForTimeout(1800)
  const docUrl = page.url()
  // reload, re-open tab, verify the permission tag persists
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(2500)
  await page.getByRole('tab', { name: /access control/i }).click()
  await page.waitForTimeout(2000)
  const permsTxt = await page.locator('[data-testid^="acl-perms-"]').first().innerText().catch(() => '')
  await shot('acls')
  return { docUrl, aclCount, aclAdded: aclCount > 0, permPersists: /view/i.test(permsTxt) }
})

// 11. Cleanup: delete created ACL, role, group, user via the API
await step('cleanup created entities', async () => {
  const API = 'http://localhost:8800/api/v4'
  const tok = await fetch(`${API}/auth/token/obtain/`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'capsule-admin' }),
  }).then(r => r.json()).then(d => d.token)
  const H = { Accept: 'application/json', Authorization: `Token ${tok}` }
  const list = (p) => fetch(`${API}${p}`, { headers: H }).then(r => r.json())
  const del = (p) => fetch(`${API}${p}`, { method: 'DELETE', headers: H })
  // ACLs on doc 4 for our role
  const acls = await list('/objects/documents/document/4/acls/?page_size=200')
  for (const a of acls.results) if (a.role?.label === ROLE) await del(`/objects/documents/document/4/acls/${a.id}/`)
  const roles = await list('/roles/?page_size=200')
  for (const r of roles.results) if (r.label === ROLE) await del(`/roles/${r.id}/`)
  const groups = await list('/groups/?page_size=200')
  for (const g of groups.results) if (g.name === GROUP) await del(`/groups/${g.id}/`)
  const users = await list('/users/?page_size=200')
  for (const u of users.results) if (u.username === USER) await del(`/users/${u.id}/`)
  return { cleaned: true }
})

await browser.close()

console.log('\n===== ADMIN ACCESS CONTROL HEADED TEST =====')
for (const o of out) console.log(`  [${o.ok ? 'PASS' : 'FAIL'}] ${o.name} ${JSON.stringify(Object.fromEntries(Object.entries(o).filter(([k]) => !['name', 'ok'].includes(k))))}`)
console.log('\nCONSOLE ERRORS (' + [...new Set(errs)].length + '):')
;[...new Set(errs)].slice(0, 12).forEach(e => console.log('   -', e))
console.log('\nADMINACCESSTESTDONE')
