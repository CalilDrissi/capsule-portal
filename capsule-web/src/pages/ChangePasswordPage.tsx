import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  Form,
  InlineNotification,
  PasswordInput,
  Stack,
  Tile,
} from '@carbon/react'
import { usePasswordChange } from '../api/queries'
import { useAppStore } from '../store/useAppStore'

/**
 * First-login password change. Forced by the App-level interceptor when
 * whoami reports must_change_password. On success the flag is cleared
 * locally and the user is routed to their role landing page.
 */
export default function ChangePasswordPage() {
  const navigate = useNavigate()
  const role = useAppStore((s) => s.role)
  const change = usePasswordChange()
  const [pw, setPw] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)

  const landing =
    role === 'client'
      ? '/workspace'
      : role === 'accountant'
        ? '/clients'
        : '/dashboard'

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (pw.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (pw !== confirm) {
      setError('Passwords do not match.')
      return
    }
    change.mutate(pw, {
      onSuccess: () => navigate(landing, { replace: true }),
    })
  }

  return (
    <div className="capsule-login">
      <Tile className="capsule-login-card">
        <Stack gap={6}>
          <div>
            <h1 className="capsule-login-title">Set a new password</h1>
            <p className="capsule-login-subtitle">
              For security, please choose a new password before continuing.
            </p>
          </div>
          {error && (
            <InlineNotification
              kind="error"
              title="Could not set password"
              subtitle={error}
              lowContrast
              hideCloseButton
              data-testid="pw-error"
            />
          )}
          <Form onSubmit={handleSubmit}>
            <Stack gap={5}>
              <PasswordInput
                id="new-password"
                labelText="New password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                required
              />
              <PasswordInput
                id="confirm-password"
                labelText="Confirm new password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
              <Button type="submit" disabled={change.isPending}>
                {change.isPending ? 'Saving…' : 'Set password'}
              </Button>
            </Stack>
          </Form>
        </Stack>
      </Tile>
    </div>
  )
}
