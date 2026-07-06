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
import { ArrowRight } from '@carbon/icons-react'
import { apiGet, obtainToken } from '../api/client'
import { useAppStore } from '../store/useAppStore'
import { requiredLabel } from '../lib/forms'
import type { Whoami } from '../api/types'

export default function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAppStore((s) => s.setAuth)
  const setWhoami = useAppStore((s) => s.setWhoami)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [attempted, setAttempted] = useState(false)

  const usernameInvalid = attempted && !username.trim()
  const passwordInvalid = attempted && !password.trim()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setAttempted(true)
    if (!username.trim() || !password.trim()) return
    setLoading(true)
    try {
      const token = await obtainToken(username, password)
      setAuth(token, username)

      // Fetch tenancy context and populate the store before routing.
      let role: Whoami['role']
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
        // whoami failed: never fail OPEN to platform/admin. Clear the
        // half-established session and ask the user to retry.
        useAppStore.getState().logout()
        setError('Impossible de charger votre compte, veuillez réessayer.')
        return
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
      setError("Nom d'utilisateur ou mot de passe invalide. Veuillez réessayer.")
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
              Connectez-vous à votre espace de documents
            </p>
          </div>
          {error && (
            <InlineNotification
              kind="error"
              title="Échec de la connexion"
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
                labelText={requiredLabel("Nom d'utilisateur")}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                invalid={usernameInvalid}
                invalidText="Le nom d'utilisateur est requis."
              />
              <PasswordInput
                id="password"
                labelText={requiredLabel('Mot de passe')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                invalid={passwordInvalid}
                invalidText="Le mot de passe est requis."
              />
              <Button type="submit" disabled={loading} renderIcon={ArrowRight}>
                {loading ? 'Connexion…' : 'Se connecter'}
              </Button>
            </Stack>
          </Form>
        </Stack>
      </Tile>
    </div>
  )
}
