import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  InlineNotification,
  Modal,
  SkeletonText,
  Stack,
  TextArea,
  TextInput,
  Tile,
} from '@carbon/react'
import { TrashCan } from '@carbon/icons-react'
import {
  useClientDetail,
  useDeleteClient,
  useSetClientActive,
  useUpdateClient,
} from '../api/queries'
import { requiredLabel } from '../lib/forms'
import ClientLoginsTable from './ClientLoginsTable'
import LogoUpload from './LogoUpload'
import type { CapsuleClient } from '../api/types'

/** The editable string fields of a client, in one form-state shape. */
type DetailsForm = {
  display_name: string
  company_name: string
  contact_name: string
  contact_email: string
  contact_phone: string
  address: string
  tax_id: string
  notes: string
  logo: string
}

const EMPTY: DetailsForm = {
  display_name: '',
  company_name: '',
  contact_name: '',
  contact_email: '',
  contact_phone: '',
  address: '',
  tax_id: '',
  notes: '',
  logo: '',
}

function toForm(c: CapsuleClient): DetailsForm {
  return {
    display_name: c.display_name ?? '',
    company_name: c.company_name ?? '',
    contact_name: c.contact_name ?? '',
    contact_email: c.contact_email ?? '',
    contact_phone: c.contact_phone ?? '',
    address: c.address ?? '',
    tax_id: c.tax_id ?? '',
    notes: c.notes ?? '',
    logo: c.logo ?? '',
  }
}

/**
 * Accountant-facing management for one client: an editable details form, the
 * logins table, and a danger zone (deactivate / delete). Mirrors the FirmsPage
 * form pattern — requiredLabel + save-time validation.
 */
export default function ClientManageTab({ clientId }: { clientId: number }) {
  const navigate = useNavigate()
  const { data: client, isLoading } = useClientDetail(clientId)
  const updateClient = useUpdateClient(clientId)
  const setActive = useSetClientActive(clientId)
  const deleteClient = useDeleteClient()

  const [form, setForm] = useState<DetailsForm>(EMPTY)
  const [original, setOriginal] = useState<DetailsForm>(EMPTY)
  const [attempted, setAttempted] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Seed the form once the client detail arrives (and re-seed after a save
  // when the query is invalidated and refetched).
  useEffect(() => {
    if (client) {
      const next = toForm(client)
      setForm(next)
      setOriginal(next)
    }
  }, [client])

  const displayNameInvalid = attempted && !form.display_name.trim()

  function set<K extends keyof DetailsForm>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function handleSave() {
    setAttempted(true)
    if (!form.display_name.trim()) return
    // Only send fields the user actually changed.
    const changed: Partial<CapsuleClient> = {}
    ;(Object.keys(form) as (keyof DetailsForm)[]).forEach((key) => {
      const value = form[key].trim()
      if (value !== (original[key] ?? '').trim()) {
        changed[key] = value
      }
    })
    if (Object.keys(changed).length === 0) return
    updateClient.mutate(changed)
  }

  function handleDelete() {
    deleteClient.mutate(clientId, {
      onSuccess: () => navigate('/clients'),
    })
  }

  if (isLoading) {
    return (
      <Tile>
        <SkeletonText paragraph lineCount={4} />
      </Tile>
    )
  }

  const active = client?.is_active !== false

  return (
    <Stack gap={7}>
      {/* Details */}
      <section>
        <h4 style={{ marginBottom: '1rem' }}>Détails</h4>
        <Stack gap={5}>
          <LogoUpload
            name={form.display_name}
            value={form.logo}
            onChange={(dataUrl) => set('logo', dataUrl)}
          />
          <TextInput
            id="client-display-name"
            labelText={requiredLabel('Nom d’affichage')}
            value={form.display_name}
            onChange={(e) => set('display_name', e.target.value)}
            invalid={displayNameInvalid}
            invalidText="Le nom d’affichage est obligatoire."
          />
          <TextInput
            id="client-company-name"
            labelText="Raison sociale"
            value={form.company_name}
            onChange={(e) => set('company_name', e.target.value)}
          />
          <TextInput
            id="client-contact-name"
            labelText="Personne à contacter"
            value={form.contact_name}
            onChange={(e) => set('contact_name', e.target.value)}
          />
          <TextInput
            id="client-contact-email"
            labelText="E-mail de contact"
            value={form.contact_email}
            onChange={(e) => set('contact_email', e.target.value)}
          />
          <TextInput
            id="client-contact-phone"
            labelText="Téléphone"
            value={form.contact_phone}
            onChange={(e) => set('contact_phone', e.target.value)}
          />
          <TextArea
            id="client-address"
            labelText="Adresse"
            rows={2}
            value={form.address}
            onChange={(e) => set('address', e.target.value)}
          />
          <TextInput
            id="client-tax-id"
            labelText="Numéro fiscal / SIRET"
            value={form.tax_id}
            onChange={(e) => set('tax_id', e.target.value)}
          />
          <TextArea
            id="client-notes"
            labelText="Notes"
            rows={3}
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
          />
          {updateClient.isError && (
            <InlineNotification
              kind="error"
              title="Impossible d’enregistrer les modifications"
              subtitle={(updateClient.error as Error)?.message}
              lowContrast
              hideCloseButton
            />
          )}
          <div>
            <Button onClick={handleSave} disabled={updateClient.isPending}>
              Enregistrer
            </Button>
          </div>
        </Stack>
      </section>

      {/* Logins */}
      <section>
        <ClientLoginsTable clientId={clientId} />
      </section>

      {/* Danger zone */}
      <section>
        <h4 style={{ marginBottom: '0.25rem' }}>Zone de danger</h4>
        <p className="capsule-hint" style={{ marginBottom: '1rem' }}>
          {active
            ? 'La désactivation bloque tous les comptes de ce client. La suppression est définitive.'
            : 'Ce client est désactivé — ses comptes sont bloqués. Réactivez-le pour rétablir l’accès.'}
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Button
            kind="tertiary"
            disabled={setActive.isPending}
            onClick={() => setActive.mutate(active ? false : true)}
            data-testid="toggle-client-active"
          >
            {active ? 'Désactiver le client' : 'Activer le client'}
          </Button>
          <Button
            kind="danger--tertiary"
            renderIcon={TrashCan}
            onClick={() => setConfirmDelete(true)}
            data-testid="delete-client"
          >
            Supprimer le client
          </Button>
        </div>
      </section>

      <Modal
        open={confirmDelete}
        danger
        modalHeading="Supprimer ce client ?"
        primaryButtonText="Supprimer définitivement"
        secondaryButtonText="Annuler"
        primaryButtonDisabled={deleteClient.isPending}
        onRequestClose={() => setConfirmDelete(false)}
        onRequestSubmit={handleDelete}
        onSecondarySubmit={() => setConfirmDelete(false)}
        data-testid="delete-client-modal"
      >
        <p>
          Cette action supprime définitivement le client, ses comptes et
          l’accès à ses documents. Elle est irréversible.
        </p>
      </Modal>
    </Stack>
  )
}
