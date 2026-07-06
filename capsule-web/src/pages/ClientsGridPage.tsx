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
  TextInput,
  Tile,
} from '@carbon/react'
import { Add } from '@carbon/icons-react'
import { useClients, useProvisionClient } from '../api/queries'
import { useAppStore } from '../store/useAppStore'
import { requiredLabel } from '../lib/forms'
import EntityAvatar from '../components/EntityAvatar'
import type { ProvisionClientResult } from '../api/types'

export default function ClientsGridPage() {
  const navigate = useNavigate()
  const firm = useAppStore((s) => s.firm)
  const { data: clients, isLoading, isError } = useClients()
  const provision = useProvisionClient()

  const [modalOpen, setModalOpen] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [created, setCreated] = useState<ProvisionClientResult | null>(null)
  const [attempted, setAttempted] = useState(false)
  const [query, setQuery] = useState('')

  const displayNameInvalid = attempted && !displayName.trim()

  const q = query.trim().toLowerCase()
  const filtered = (clients ?? []).filter(
    (c) =>
      !q ||
      c.display_name.toLowerCase().includes(q) ||
      (c.company_name ?? '').toLowerCase().includes(q),
  )

  function openModal() {
    setDisplayName('')
    setCreated(null)
    setAttempted(false)
    setModalOpen(true)
  }

  function resetModal() {
    setModalOpen(false)
    setDisplayName('')
    setCreated(null)
    setAttempted(false)
  }

  function handleCreate() {
    setAttempted(true)
    if (!firm || !displayName.trim()) return
    provision.mutate(
      { firm_id: firm.id, display_name: displayName.trim() },
      { onSuccess: (res) => setCreated(res) },
    )
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
        <h2 className="capsule-page__title">Clients</h2>
        <Button
          renderIcon={Add}
          onClick={openModal}
          data-testid="new-client"
        >
          New client
        </Button>
      </div>

      {isError && (
        <InlineNotification
          kind="error"
          title="Could not load clients"
          lowContrast
          hideCloseButton
        />
      )}

      {!isLoading && (clients?.length ?? 0) > 0 && (
        <Search
          size="lg"
          labelText="Search clients"
          placeholder="Search clients by name or company"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onClear={() => setQuery('')}
          data-testid="clients-search"
          style={{ marginBottom: '1rem' }}
        />
      )}

      {isLoading ? (
        <Tile>
          <SkeletonText paragraph lineCount={3} />
        </Tile>
      ) : (clients?.length ?? 0) === 0 ? (
        <Tile className="capsule-empty" data-testid="clients-empty">
          <h4>No clients yet</h4>
          <p>Create your first client to get started.</p>
        </Tile>
      ) : filtered.length === 0 ? (
        <Tile className="capsule-empty">
          <p>No clients match “{query}”.</p>
        </Tile>
      ) : (
        <div className="capsule-stats" data-testid="clients-grid">
          {filtered.map((c) => (
            <ClickableTile
              key={c.id}
              className="capsule-stat"
              onClick={() => navigate(`/clients/${c.id}`)}
              data-testid={`client-card-${c.id}`}
            >
              <div className="capsule-stat__icon">
                <EntityAvatar name={c.display_name} logo={c.logo} size={48} />
              </div>
              <div className="capsule-stat__value" style={{ fontSize: '1.25rem' }}>
                {c.display_name}
              </div>
              {c.company_name && (
                <div className="capsule-stat__label">{c.company_name}</div>
              )}
              <div className="capsule-stat__label">
                {c.is_active === false
                  ? 'Inactive'
                  : c.must_change_password
                    ? 'Pending first login'
                    : 'Active'}
              </div>
            </ClickableTile>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        modalHeading={created ? 'Client created' : 'New client'}
        primaryButtonText={created ? 'Done' : 'Create'}
        secondaryButtonText={created ? undefined : 'Cancel'}
        primaryButtonDisabled={!created && provision.isPending}
        onRequestClose={resetModal}
        onRequestSubmit={created ? resetModal : handleCreate}
        onSecondarySubmit={resetModal}
        data-testid="new-client-modal"
      >
        {created ? (
          <Stack gap={5}>
            <InlineNotification
              kind="success"
              title="Client created — send them this invite link"
              subtitle="They open the link, set their own password, and are taken straight to their workspace. The link can only be used once."
              lowContrast
              hideCloseButton
            />
            <div>
              <p className="cds--label">Invite link</p>
              <CodeSnippet type="multi" data-testid="invite-link">
                {created.invite_path
                  ? `${window.location.origin}${created.invite_path}`
                  : '—'}
              </CodeSnippet>
            </div>
            <details>
              <summary className="capsule-hint">
                Or share temporary credentials instead
              </summary>
              <div style={{ marginTop: '0.75rem' }}>
                <p className="cds--label">Temporary username</p>
                <CodeSnippet type="single" data-testid="temp-username">
                  {created.temp_username}
                </CodeSnippet>
                <p className="cds--label" style={{ marginTop: '0.5rem' }}>
                  Temporary password
                </p>
                <CodeSnippet type="single" data-testid="temp-password">
                  {created.temp_password}
                </CodeSnippet>
              </div>
            </details>
          </Stack>
        ) : (
          <Stack gap={5}>
            <TextInput
              id="client-display-name"
              labelText={requiredLabel('Display name')}
              placeholder="e.g. Acme Corp"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              invalid={displayNameInvalid}
              invalidText="Display name is required."
            />
          </Stack>
        )}
      </Modal>
    </div>
  )
}
