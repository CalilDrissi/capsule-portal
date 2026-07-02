import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  Form,
  InlineNotification,
  PasswordInput,
  Stack,
  TextInput,
  Tile,
} from '@carbon/react'
import { apiGet, obtainToken } from '../api/client'
import { useAppStore } from '../store/useAppStore'
import type { Whoami } from '../api/types'

export default function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAppStore((s) => s.setAuth)
  const setWhoami = useAppStore((s) => s.setWhoami)
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const token = await obtainToken(username, password)
      setAuth(token, username)

      // Fetch tenancy context and populate the store before routing.
      let role: Whoami['role'] = 'platform'
      let mustChange = false
      try {
        const who = await apiGet<Whoami>('/capsule/whoami/')
        role = who.role
        mustChange = who.must_change_password
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
        // whoami unavailable → treat as platform (existing behavior).
        setWhoami({
          firm: null,
          role: 'platform',
          clientId: null,
          mustChangePassword: false,
        })
      }

      if (mustChange) {
        navigate('/change-password', { replace: true })
      } else if (role === 'accountant') {
        navigate('/clients', { replace: true })
      } else if (role === 'client') {
        navigate('/workspace', { replace: true })
      } else {
        navigate('/documents', { replace: true })
      }
    } catch {
      setError('Invalid username or password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="capsule-login">
      <Tile className="capsule-login-card">
        <Stack gap={6}>
          <div>
            <h1 className="capsule-login-title">Capsule</h1>
            <p className="capsule-login-subtitle">
              Sign in to your document workspace
            </p>
          </div>
          {error && (
            <InlineNotification
              kind="error"
              title="Sign in failed"
              subtitle={error}
              lowContrast
              hideCloseButton
              data-testid="login-error"
            />
          )}
          <Form onSubmit={handleSubmit}>
            <Stack gap={5}>
              <TextInput
                id="username"
                labelText="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
              <PasswordInput
                id="password"
                labelText="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Button type="submit" disabled={loading}>
                {loading ? 'Signing in…' : 'Sign in'}
              </Button>
            </Stack>
          </Form>
        </Stack>
      </Tile>
    </div>
  )
}
