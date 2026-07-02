import { useAppStore } from '../store/useAppStore'

export const API_BASE =
  import.meta.env.VITE_API_BASE ?? 'http://localhost:8800/api/v4'

export class ApiError extends Error {
  status: number
  body: unknown
  constructor(status: number, message: string, body: unknown) {
    super(message)
    this.status = status
    this.body = body
  }
}

function authHeaders(): Record<string, string> {
  const token = useAppStore.getState().token
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (token) headers.Authorization = `Token ${token}`
  return headers
}

/** JSON GET against the Mayan API. Path is relative to API_BASE (leading slash optional). */
export async function apiGet<T>(path: string): Promise<T> {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`
  const res = await fetch(url, { headers: authHeaders() })
  if (!res.ok) {
    const body = await safeBody(res)
    throw new ApiError(res.status, `GET ${path} failed (${res.status})`, body)
  }
  return (await res.json()) as T
}

/** JSON POST against the Mayan API. Returns parsed body (or null for 204). */
export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return apiSend<T>('POST', path, body)
}

/** JSON PATCH against the Mayan API. */
export async function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  return apiSend<T>('PATCH', path, body)
}

/** JSON DELETE against the Mayan API. Returns null on 202/204. */
export async function apiDelete<T = null>(path: string, body?: unknown): Promise<T> {
  return apiSend<T>('DELETE', path, body)
}

async function apiSend<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`
  const headers = authHeaders()
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const errBody = await safeBody(res)
    throw new ApiError(
      res.status,
      `${method} ${path} failed (${res.status})`,
      errBody,
    )
  }
  if (res.status === 204 || res.status === 202) return null as T
  const text = await res.text()
  if (!text) return null as T
  try {
    return JSON.parse(text) as T
  } catch {
    return text as unknown as T
  }
}

/**
 * Download a protected file with the auth token. Fetches as a blob (the
 * Authorization header can't ride on a plain <a download>) and triggers a save.
 */
export async function downloadFile(
  downloadUrl: string,
  filename: string,
): Promise<void> {
  const res = await fetch(downloadUrl, { headers: authHeaders() })
  if (!res.ok) {
    throw new ApiError(res.status, `Download failed (${res.status})`, null)
  }
  const blob = await res.blob()
  const objUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = objUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(objUrl), 1000)
}

/**
 * Like `downloadFile`, but issues a POST (some Capsule actions, e.g. period
 * export, are POST-only). Streams the response as a blob and triggers a save.
 * Throws ApiError on non-2xx so callers can surface the failure.
 */
export async function downloadFilePost(
  url: string,
  filename: string,
  body?: unknown,
): Promise<void> {
  const headers = authHeaders()
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const errBody = await safeBody(res)
    throw new ApiError(res.status, `Download failed (${res.status})`, errBody)
  }
  const blob = await res.blob()
  const objUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = objUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(objUrl), 1000)
}

/** Obtain an auth token. Does NOT require an existing token. */
export async function obtainToken(
  username: string,
  password: string,
): Promise<string> {
  const res = await fetch(`${API_BASE}/auth/token/obtain/`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  if (!res.ok) {
    const body = await safeBody(res)
    throw new ApiError(res.status, 'Invalid username or password', body)
  }
  const data = (await res.json()) as { token: string }
  return data.token
}

/**
 * Change the current user's password. Prefers the Capsule first-login
 * endpoint (which also clears the must_change_password flag server-side);
 * falls back to PATCH /users/current/ if that endpoint is not deployed.
 * Returns true when the dedicated endpoint handled it (flag cleared),
 * false when the fallback was used (caller must clear the flag locally).
 */
export async function changePassword(newPassword: string): Promise<boolean> {
  try {
    await apiPost(`/capsule/password-change/`, { new_password: newPassword })
    return true
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) {
      await apiPatch(`/users/current/`, { password: newPassword })
      return false
    }
    throw e
  }
}

/**
 * Upload a document via the Mayan web-form source action (RESTAPI interface).
 * The action expects an `arguments` JSON field + a binary `file` field.
 */
export async function uploadDocument(
  sourceId: number,
  documentTypeId: number,
  file: File,
  label?: string,
  extraArgs?: Record<string, unknown>,
): Promise<unknown> {
  const form = new FormData()
  const args: Record<string, unknown> = { document_type_id: documentTypeId }
  if (label) args.label = label
  if (extraArgs) Object.assign(args, extraArgs)
  // `arguments` must be a plain text field (JSON string), not a file part.
  form.append('arguments', JSON.stringify(args))
  form.append('file', file, file.name)

  const res = await fetch(
    `${API_BASE}/sources/${sourceId}/actions/document_upload/execute/`,
    { method: 'POST', headers: authHeaders(), body: form },
  )
  if (!res.ok) {
    const body = await safeBody(res)
    throw new ApiError(res.status, `Upload failed (${res.status})`, body)
  }
  return safeBody(res)
}

/**
 * After a client upload, locate the newly created document by label and apply
 * the firm's category + document-date metadata. The upload action returns no
 * body and processes asynchronously, so we poll the document list briefly for
 * the freshest matching label, then POST the metadata (the auto-ACL handler
 * grants the uploader metadata-add permission). Best-effort: failures here do
 * not fail the upload — grouping falls back to the creation date.
 */
export async function applyUploadMetadata(opts: {
  label: string
  categoryTypeId: number | null
  documentDateTypeId: number | null
  category?: string
  documentDate?: string
}): Promise<void> {
  const { label, categoryTypeId, documentDateTypeId, category, documentDate } =
    opts
  if (!category && !documentDate) return
  if (!categoryTypeId && !documentDateTypeId) return

  // Poll for the new document (by label, newest first).
  let docId: number | null = null
  for (let attempt = 0; attempt < 8 && docId == null; attempt++) {
    await new Promise((r) => setTimeout(r, attempt === 0 ? 600 : 900))
    try {
      const data = await apiGet<{ results: { id: number; label: string }[] }>(
        `/documents/?page_size=10`,
      )
      const match = data.results.find((d) => d.label === label)
      if (match) docId = match.id
    } catch {
      /* keep polling */
    }
  }
  if (docId == null) return

  const posts: Promise<unknown>[] = []
  if (category && categoryTypeId != null) {
    posts.push(
      apiPost(`/documents/${docId}/metadata/`, {
        metadata_type_id: categoryTypeId,
        value: category,
      }).catch(() => null),
    )
  }
  if (documentDate && documentDateTypeId != null) {
    posts.push(
      apiPost(`/documents/${docId}/metadata/`, {
        metadata_type_id: documentDateTypeId,
        value: documentDate,
      }).catch(() => null),
    )
  }
  await Promise.all(posts)
}

/**
 * Fetch a protected page image with the auth token and return an object URL.
 * Mayan serves the page image as image/jpeg; the <img> tag cannot send the
 * Authorization header, so we fetch it as a blob first.
 */
export async function fetchImageObjectUrl(imageUrl: string): Promise<string> {
  const res = await fetch(imageUrl, { headers: authHeaders() })
  if (!res.ok) {
    throw new ApiError(res.status, `Image fetch failed (${res.status})`, null)
  }
  const blob = await res.blob()
  return URL.createObjectURL(blob)
}

async function safeBody(res: Response): Promise<unknown> {
  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}
