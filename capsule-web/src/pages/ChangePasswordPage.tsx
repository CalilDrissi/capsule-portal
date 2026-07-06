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
import { ArrowRight } from '@carbon/icons-react'
import { usePasswordChange } from '../api/queries'
import { useAppStore } from '../store/useAppStore'
import { apiErrorMessage } from '../api/client'
import { MIN_PASSWORD_LENGTH, requiredLabel } from '../lib/forms'

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
  const [attempted, setAttempted] = useState(false)

  const pwInvalid = attempted && pw.trim().length < MIN_PASSWORD_LENGTH
  const confirmInvalid = attempted && (!confirm.trim() || pw !== confirm)
  const confirmInvalidText = !confirm.trim()
    ? 'Confirm new password is required.'
    : 'Passwords do not match.'

  const landing =
    role === 'client'
      ? '/workspace'
      : role === 'accountant'
        ? '/clients'
        : '/dashboard'

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setAttempted(true)
    if (pw.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
      return
    }
    if (pw !== confirm) {
      setError('Passwords do not match.')
      return
    }
    change.mutate(pw, {
      onSuccess: () => navigate(landing, { replace: true }),
      onError: (err) =>
        setError(
          apiErrorMessage(err, 'Could not set your password. Please try again.'),
        ),
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
                labelText={requiredLabel('New password')}
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                invalid={pwInvalid}
                invalidText={`New password must be at least ${MIN_PASSWORD_LENGTH} characters.`}
              />
              <PasswordInput
                id="confirm-password"
                labelText={requiredLabel('Confirm new password')}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                invalid={confirmInvalid}
                invalidText={confirmInvalidText}
              />
              <Button type="submit" disabled={change.isPending} renderIcon={ArrowRight}>
                {change.isPending ? 'Saving…' : 'Set password'}
              </Button>
            </Stack>
          </Form>
        </Stack>
      </Tile>
    </div>
  )
}
