import fs from 'fs'

// Shared provisioning + UI helpers for the headed tenancy suites (p2/p3/p4).
// Each suite self-provisions its own firm/accountant/client(s) via the Capsule
// provisioning API so the suites are independent and re-runnable — no reliance
// on pre-existing users or /tmp fixture files.

export const APP = 'http://localhost:5180'
export const API = 'http://localhost:8800/api/v4'
const ADMIN = { u: 'admin', p: 'capsule-admin' }
// Accountant password must satisfy the policy (>=10 chars, not all-numeric,
// not a common password).
export const ACCT_PASSWORD = 'Acct-Str0ng-2026!'

async function jfetch(path, { method = 'GET', token, body } = {}) {
  const headers = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Token ${token}`
  const res = await fetch(API + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const t = await res.text()
    throw new Error(`${method} ${path} -> ${res.status}: ${t.slice(0, 300)}`)
  }
  const t = await res.text()
  return t ? JSON.parse(t) : null
}

export async function adminToken() {
  const d = await jfetch('/auth/token/obtain/', {
    method: 'POST',
    body: { username: ADMIN.u, password: ADMIN.p },
  })
  return d.token
}

function slug(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
}

/**
 * Create a fresh firm + one accountant. Returns the admin token, firm object,
 * accountant credentials, and a unique suffix for building client names.
 */
export async function provisionFirm(prefix) {
  const token = await adminToken()
  const suffix = Date.now().toString(36) + Math.floor(Math.random() * 1000)
  const firm = await jfetch('/capsule/firms/', {
    method: 'POST',
    token,
    body: { name: `${prefix} ${suffix}` },
  })
  const acctUser = `${slug(prefix)}_acct_${suffix}`
  await jfetch(`/capsule/firms/${firm.id}/accountants/`, {
    method: 'POST',
    token,
    body: { username: acctUser, password: ACCT_PASSWORD, full_name: `${prefix} Accountant` },
  })
  return { token, firm, acct: { u: acctUser, p: ACCT_PASSWORD }, suffix }
}

/**
 * Provision a client under a firm. Returns the full provisioning result:
 * { client:{id,cabinet_id,...}, temp_username, temp_password, invite_token, invite_path }.
 */
export async function provisionClient(token, firmId, displayName) {
  return jfetch('/capsule/clients/', {
    method: 'POST',
    token,
    body: { firm_id: firmId, display_name: displayName },
  })
}

/**
 * Write a minimal, valid single-page PDF to `path` (Mayan can page-count it;
 * plain .txt/.csv are NOT usable because the page-count step can crash on them).
 */
export function writeSamplePdf(path) {
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
  ]
  const streamText = 'BT /F1 18 Tf 40 100 Td (Capsule test document) Tj ET'
  objs.push(`<< /Length ${streamText.length} >>\nstream\n${streamText}\nendstream`)
  objs.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')

  let pdf = '%PDF-1.4\n'
  const offsets = []
  objs.forEach((o, i) => {
    offsets.push(pdf.length)
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`
  })
  const xrefPos = pdf.length
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`
  for (const off of offsets) pdf += `${String(off).padStart(10, '0')} 00000 n \n`
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`
  fs.writeFileSync(path, pdf, 'latin1')
  return path
}

/**
 * Drive the public /invite/:token page to set the client's password. On
 * success the app logs the client in and navigates to /workspace.
 */
export async function activateClient(page, invitePath, password) {
  await page.goto(APP + invitePath, { waitUntil: 'networkidle' })
  await page.waitForSelector('#invite-password', { timeout: 15000 })
  await page.fill('#invite-password', password)
  await page.fill('#invite-confirm', password)
  await page.locator('[data-testid="invite-submit"]').click()
  await page.waitForFunction(() => location.pathname.startsWith('/workspace'), {
    timeout: 15000,
  }).catch(() => {})
  await page.waitForTimeout(1500)
  return page.url()
}

/**
 * Upload one document through the client Upload UI. `file` is an absolute path
 * to a PDF. `category` (optional) is selected by value; `date` (optional) is an
 * ISO YYYY-MM-DD document date; `label` (optional) overrides the label.
 */
export async function uploadViaUi(page, { file, category, date, label }) {
  await page.goto(APP + '/workspace/upload', { waitUntil: 'networkidle' })
  await page.waitForSelector('input[type="file"]', { timeout: 15000 })
  await page.locator('input[type="file"]').setInputFiles(file)
  await page.waitForTimeout(600)
  if (category) {
    await page.selectOption('#upload-category', category).catch(() => {})
  }
  if (date) {
    await page.fill('#upload-document-date', date)
    await page.locator('#upload-document-date').press('Enter')
    await page.waitForTimeout(300)
  }
  if (label) await page.fill('#upload-label', label)
  await page.waitForTimeout(300)
  await page.locator('[data-testid="upload-submit"]').click()
  // Upload + async metadata application; the page navigates to /workspace on success.
  await page.waitForFunction(
    () => location.pathname === '/workspace',
    { timeout: 20000 },
  ).catch(() => {})
  await page.waitForTimeout(1500)
}
