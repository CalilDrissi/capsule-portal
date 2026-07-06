import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  ClickableTile,
  CodeSnippet,
  InlineNotification,
  Modal,
  Search,
  SkeletonText,
  Stack,
  Tag,
  TextInput,
  Tile,
} from '@carbon/react'
import { Add } from '@carbon/icons-react'
import {
  useCreateAccountant,
  useCreateFirm,
  useDeleteFirm,
  useFirms,
} from '../api/queries'
import { apiErrorMessage } from '../api/client'
import { requiredLabel } from '../lib/forms'
import EntityAvatar from '../components/EntityAvatar'
import type { Firm } from '../api/types'

/** A readable, policy-passing password (>=10 chars, mixed case + digits). */
function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  let s = ''
  for (let i = 0; i < 10; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return `Acc-${s}`
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 20)
}


interface Created {
  firm: Firm
  username: string
  password: string
}

export default function FirmsPage() {
  const navigate = useNavigate()
  const { data: firms, isLoading, isError } = useFirms()
  const createFirm = useCreateFirm()
  const createAccountant = useCreateAccountant()
  const deleteFirm = useDeleteFirm()

  const [open, setOpen] = useState(false)
  const [firmName, setFirmName] = useState('')
  const [acctName, setAcctName] = useState('')
  const [acctUser, setAcctUser] = useState('')
  const [acctPass, setAcctPass] = useState('')
  const [created, setCreated] = useState<Created | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [attempted, setAttempted] = useState(false)
  const [query, setQuery] = useState('')

  const q = query.trim().toLowerCase()
  const filtered = (firms ?? []).filter(
    (f) => !q || f.name.toLowerCase().includes(q) || f.slug.toLowerCase().includes(q),
  )

  const busy = createFirm.isPending || createAccountant.isPending

  // Field-level validity (only surfaced after a save attempt).
  const firmNameInvalid = attempted && !firmName.trim()
  const acctNameInvalid = attempted && !acctName.trim()
  const passInvalid = attempted && acctPass.trim().length < 10

  function openModal() {
    setFirmName('')
    setAcctName('')
    setAcctUser('')
    setAcctPass(generatePassword())
    setCreated(null)
    setError(null)
    setAttempted(false)
    setOpen(true)
  }

  async function handleCreate() {
    setError(null)
    setAttempted(true)
    const name = firmName.trim()
    if (!name || !acctName.trim() || acctPass.trim().length < 10) return
    let firm: Firm | null = null
    try {
      firm = await createFirm.mutateAsync({ name })
      try {
        const res = await createAccountant.mutateAsync({
          firmId: firm.id,
          // Blank -> the backend auto-generates a unique username.
          username: acctUser.trim(),
          password: acctPass,
          full_name: acctName.trim(),
        })
        // Show the REAL username the server assigned, not a local guess.
        setCreated({ firm, username: res.user.username, password: acctPass })
      } catch (accountantError) {
        // The firm was created but the accountant failed — roll the firm back
        // so we don't leave an orphan firm with no login.
        try {
          await deleteFirm.mutateAsync(firm.id)
        } catch {
          /* best effort */
        }
        throw accountantError
      }
    } catch (e) {
      setError(apiErrorMessage(e, 'Impossible de créer le cabinet. Veuillez réessayer.'))
    }
  }

  return (
    <div className="capsule-page">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h2 className="capsule-page__title">Cabinets</h2>
        <Button renderIcon={Add} onClick={openModal} data-testid="new-firm">
          Nouveau cabinet
        </Button>
      </div>

      <p className="capsule-hint" style={{ marginTop: '0.25rem' }}>
        Chaque cabinet est une structure comptable isolée avec ses propres
        comptables et clients. Créez ici un cabinet et son premier comptable, puis
        connectez-vous en tant que ce comptable pour ajouter des clients.
      </p>

      {isError && (
        <InlineNotification
          kind="error"
          title="Impossible de charger les cabinets"
          lowContrast
          hideCloseButton
        />
      )}

      {!isLoading && (firms?.length ?? 0) > 0 && (
        <Search
          size="lg"
          labelText="Rechercher des cabinets"
          placeholder="Rechercher un cabinet par nom"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onClear={() => setQuery('')}
          data-testid="firms-search"
          style={{ marginBottom: '1rem' }}
        />
      )}

      {isLoading ? (
        <Tile>
          <SkeletonText paragraph lineCount={3} />
        </Tile>
      ) : (firms?.length ?? 0) === 0 ? (
        <Tile className="capsule-empty" data-testid="firms-empty">
          <h4>Aucun cabinet pour le moment</h4>
          <p>Créez votre premier cabinet pour commencer.</p>
        </Tile>
      ) : filtered.length === 0 ? (
        <Tile className="capsule-empty">
          <p>Aucun cabinet ne correspond à «&nbsp;{query}&nbsp;».</p>
        </Tile>
      ) : (
        <div className="capsule-stats" data-testid="firms-grid">
          {filtered.map((f) => (
            <ClickableTile
              key={f.id}
              className="capsule-stat"
              data-testid={`firm-${f.id}`}
              onClick={() => navigate(`/firms/${f.id}`)}
            >
              <div className="capsule-stat__icon">
                <EntityAvatar name={f.name} logo={f.logo} size={48} />
              </div>
              <div className="capsule-stat__value" style={{ fontSize: '1.25rem' }}>
                {f.name}
              </div>
              <div className="capsule-stat__label">{f.slug}</div>
              <div style={{ marginTop: '0.5rem' }}>
                <Tag type={f.is_active === false ? 'gray' : 'green'} size="sm">
                  {f.is_active === false ? 'Inactif' : 'Actif'}
                </Tag>
              </div>
            </ClickableTile>
          ))}
        </div>
      )}

      <Modal
        open={open}
        modalHeading={created ? 'Cabinet créé' : 'Nouveau cabinet'}
        primaryButtonText={created ? 'Terminé' : 'Créer le cabinet'}
        secondaryButtonText={created ? undefined : 'Annuler'}
        primaryButtonDisabled={!created && busy}
        onRequestClose={() => setOpen(false)}
        onRequestSubmit={created ? () => setOpen(false) : handleCreate}
        onSecondarySubmit={() => setOpen(false)}
        data-testid="new-firm-modal"
      >
        {created ? (
          <Stack gap={5}>
            <InlineNotification
              kind="success"
              title={`${created.firm.name} est prêt`}
              subtitle="Connectez-vous avec le compte comptable ci-dessous pour ajouter des clients. Modifiez le mot de passe après la première connexion."
              lowContrast
              hideCloseButton
            />
            <div>
              <p className="cds--label">URL de connexion</p>
              <CodeSnippet type="single">{window.location.origin}</CodeSnippet>
              <p className="cds--label" style={{ marginTop: '0.5rem' }}>
                Nom d'utilisateur du comptable
              </p>
              <CodeSnippet type="single" data-testid="acct-username">
                {created.username}
              </CodeSnippet>
              <p className="cds--label" style={{ marginTop: '0.5rem' }}>
                Mot de passe du comptable
              </p>
              <CodeSnippet type="single" data-testid="acct-password">
                {created.password}
              </CodeSnippet>
            </div>
          </Stack>
        ) : (
          <Stack gap={5}>
            {error && (
              <InlineNotification
                kind="error"
                title="Impossible de créer le cabinet"
                subtitle={error}
                lowContrast
                hideCloseButton
              />
            )}
            <TextInput
              id="firm-name"
              labelText={requiredLabel('Nom du cabinet')}
              placeholder="ex. Kiloctet Comptabilité"
              value={firmName}
              onChange={(e) => setFirmName(e.target.value)}
              invalid={firmNameInvalid}
              invalidText="Le nom du cabinet est obligatoire."
            />
            <TextInput
              id="acct-name"
              labelText={requiredLabel('Nom complet du comptable')}
              placeholder="ex. Sam Rivera"
              value={acctName}
              onChange={(e) => setAcctName(e.target.value)}
              invalid={acctNameInvalid}
              invalidText="Le nom complet du comptable est obligatoire."
            />
            <TextInput
              id="acct-user"
              labelText="Nom d'utilisateur du comptable (facultatif)"
              helperText="Utilisé pour se connecter. Laissez vide pour le générer automatiquement à partir du nom du cabinet."
              placeholder={firmName ? `${slug(firmName)}_admin` : 'auto'}
              value={acctUser}
              onChange={(e) => setAcctUser(e.target.value)}
            />
            <TextInput
              id="acct-pass"
              labelText={requiredLabel('Mot de passe du comptable')}
              helperText="Généré automatiquement — vous pouvez le modifier. Au moins 10 caractères."
              value={acctPass}
              onChange={(e) => setAcctPass(e.target.value)}
              invalid={passInvalid}
              invalidText="Le mot de passe doit comporter au moins 10 caractères."
            />
          </Stack>
        )}
      </Modal>
    </div>
  )
}
