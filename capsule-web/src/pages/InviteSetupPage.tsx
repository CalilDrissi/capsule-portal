import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Button,
  Form,
  InlineNotification,
  Loading,
  PasswordInput,
  Stack,
  TextInput,
  Tile,
} from '@carbon/react'
import { apiGet, apiPost, obtainToken } from '../api/client'
import { useAppStore } from '../store/useAppStore'
import type { Whoami } from '../api/types'

interface InviteInfo {
  firm_name: string
  display_name: string
  username: string
}

/**
 * PUBLIC (logged-out) account-setup page reached via a one-time invite link
 * (`/invite/:token`). The client sets their password, which consumes the
 * token server-side, then is logged straight into their workspace.
 */
export default function InviteSetupPage() {
  const { token } = useParams()
  const navigate = useNavigate()
  const setAuth = useAppStore((s) => s.setAuth)
  const setWhoami = useAppStore((s) => s.setWhoami)

  const [info, setInfo] = useState<InviteInfo | null>(null)
  const [loadingInfo, setLoadingInfo] = useState(true)
  const [invalid, setInvalid] = useState(false)

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let active = true
    apiGet<InviteInfo>(`/capsule/invite/${token}/`)
      .then((d) => {
        if (active) setInfo(d)
      })
      .catch(() => {
        if (active) setInvalid(true)
      })
      .finally(() => {
        if (active) setLoadingInfo(false)
      })
    return () => {
      active = false
    }
  }, [token])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 8) {
      setError('Please choose a password of at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setSubmitting(true)
    try {
      await apiPost(`/capsule/invite/${token}/`, { password })
      // The token is now consumed; log in with the new credentials.
      const username = info!.username
      const authToken = await obtainToken(username, password)
      setAuth(authToken, username)
      try {
        const who = await apiGet<Whoami>('/capsule/whoami/')
        setWhoami({
          firm: who.firm,
          role: who.role,
          clientId: who.client_id,
          mustChangePassword: who.must_change_password,
          documentTypeId: who.document_type_id,
          sourceId: who.source_id,
          categoryMetadataTypeId: who.category_metadata_type_id,
          documentDateMetadataTypeId: who.document_date_metadata_type_id,
          categories: who.categories ?? [],
        })
      } catch {
        setWhoami({
          firm: null,
          role: 'client',
          clientId: null,
          mustChangePassword: false,
        })
      }
      navigate('/workspace', { replace: true })
    } catch {
      setError('This invite link is no longer valid. Please ask your accountant for a new one.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="capsule-login">
      <Tile className="capsule-login-card">
        {loadingInfo ? (
          <Loading withOverlay={false} />
        ) : invalid ? (
          <Stack gap={5}>
            <h1 className="capsule-login-title">Capsule</h1>
            <InlineNotification
              kind="error"
              title="Invite link invalid or already used"
              subtitle="Please ask your accountant to send you a new invite link."
              lowContrast
              hideCloseButton
            />
            <Button kind="tertiary" onClick={() => navigate('/login')}>
              Go to sign in
            </Button>
          </Stack>
        ) : (
          <Stack gap={6}>
            <div>
              <h1 className="capsule-login-title">Welcome to Capsule</h1>
              <p className="capsule-login-subtitle">
                Set up your account for <strong>{info?.display_name}</strong>
                {info?.firm_name ? ` — ${info.firm_name}` : ''}
              </p>
            </div>
            {error && (
              <InlineNotification
                kind="error"
                title="Could not complete setup"
                subtitle={error}
                lowContrast
                hideCloseButton
                data-testid="invite-error"
              />
            )}
            <Form onSubmit={handleSubmit}>
              <Stack gap={5}>
                <TextInput
                  id="invite-username"
                  labelText="Username"
                  value={info?.username ?? ''}
                  readOnly
                />
                <PasswordInput
                  id="invite-password"
                  labelText="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <PasswordInput
                  id="invite-confirm"
                  labelText="Confirm password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                />
                <Button type="submit" disabled={submitting} data-testid="invite-submit">
                  {submitting ? 'Setting up…' : 'Create account'}
                </Button>
              </Stack>
            </Form>
          </Stack>
        )}
      </Tile>
    </div>
  )
}
