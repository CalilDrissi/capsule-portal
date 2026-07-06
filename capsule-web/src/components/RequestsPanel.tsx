import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  Dropdown,
  Form,
  InlineLoading,
  Modal,
  Stack,
  StructuredListBody,
  StructuredListCell,
  StructuredListHead,
  StructuredListRow,
  StructuredListWrapper,
  Tag,
  TextArea,
  TextInput,
  Tile,
} from '@carbon/react'
import { Add, CheckmarkOutline } from '@carbon/icons-react'
import {
  useClientRequests,
  useCreateRequest,
  useUpdateRequest,
} from '../api/queries'
import { useAppStore } from '../store/useAppStore'

function StatusTag({ status }: { status: 'requested' | 'fulfilled' }) {
  return (
    <Tag type={status === 'fulfilled' ? 'green' : 'blue'}>
      {status === 'fulfilled' ? 'Fournie' : 'Ouverte'}
    </Tag>
  )
}

/**
 * Accountant view of a client's document requests: a list plus a
 * "Request documents" modal (period + category + note). Replaces the
 * Requests tab stub in the accountant client workspace.
 */
export function AccountantRequestsPanel({ clientId }: { clientId: number }) {
  const categories = useAppStore((s) => s.categories)
  const { data, isLoading } = useClientRequests(clientId)
  const create = useCreateRequest(clientId)
  const update = useUpdateRequest(clientId)

  const [open, setOpen] = useState(false)
  const [period, setPeriod] = useState('')
  const [category, setCategory] = useState<string | null>(null)
  const [note, setNote] = useState('')

  const requests = data ?? []

  function submit() {
    create.mutate(
      {
        period_key: period.trim() || undefined,
        category: category || undefined,
        note: note.trim() || undefined,
      },
      {
        onSuccess: () => {
          setOpen(false)
          setPeriod('')
          setCategory(null)
          setNote('')
        },
      },
    )
  }

  return (
    <Stack gap={5}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          renderIcon={Add}
          onClick={() => setOpen(true)}
          data-testid="request-documents"
        >
          Demander des documents
        </Button>
      </div>

      {isLoading ? (
        <InlineLoading description="Chargement des demandes…" />
      ) : requests.length === 0 ? (
        <Tile className="capsule-empty" data-testid="requests-empty">
          <h4>Aucune demande pour le moment</h4>
          <p>Demandez un document pour l&apos;ajouter à la liste du client.</p>
        </Tile>
      ) : (
        <StructuredListWrapper isCondensed data-testid="requests-list">
          <StructuredListHead>
            <StructuredListRow head>
              <StructuredListCell head>Catégorie</StructuredListCell>
              <StructuredListCell head>Période</StructuredListCell>
              <StructuredListCell head>Statut</StructuredListCell>
              <StructuredListCell head>Action</StructuredListCell>
            </StructuredListRow>
          </StructuredListHead>
          <StructuredListBody>
            {requests.map((r) => (
              <StructuredListRow key={r.id} data-testid={`request-${r.id}`}>
                <StructuredListCell>{r.category || '—'}</StructuredListCell>
                <StructuredListCell>{r.period_key || '—'}</StructuredListCell>
                <StructuredListCell>
                  <StatusTag status={r.status} />
                </StructuredListCell>
                <StructuredListCell>
                  {r.status === 'requested' && (
                    <Button
                      kind="ghost"
                      size="sm"
                      renderIcon={CheckmarkOutline}
                      data-testid={`request-fulfill-${r.id}`}
                      onClick={() =>
                        update.mutate({ id: r.id, status: 'fulfilled' })
                      }
                    >
                      Marquer comme fournie
                    </Button>
                  )}
                </StructuredListCell>
              </StructuredListRow>
            ))}
          </StructuredListBody>
        </StructuredListWrapper>
      )}

      <Modal
        open={open}
        modalHeading="Demander un document"
        primaryButtonText={create.isPending ? 'Envoi en cours…' : 'Demander'}
        secondaryButtonText="Annuler"
        primaryButtonDisabled={create.isPending}
        onRequestClose={() => setOpen(false)}
        onRequestSubmit={submit}
      >
        <Form onSubmit={(e) => e.preventDefault()}>
          <Stack gap={5}>
            <Dropdown
              id="request-category"
              titleText="Catégorie"
              label="Choisir une catégorie"
              items={categories}
              selectedItem={category}
              itemToString={(i) => i ?? ''}
              onChange={({ selectedItem }) => setCategory(selectedItem ?? null)}
            />
            <TextInput
              id="request-period"
              labelText="Période (ex. 2026-06 ou 2026)"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              data-testid="request-period"
            />
            <TextArea
              id="request-note"
              labelText="Note (facultatif)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </Stack>
        </Form>
      </Modal>
    </Stack>
  )
}

/**
 * Client checklist of open document requests from their accountant. Each open
 * item links to Upload (to fulfill) and offers a "Mark provided" action.
 */
export function ClientChecklistPanel({ clientId }: { clientId: number }) {
  const navigate = useNavigate()
  const { data, isLoading } = useClientRequests(clientId)
  const update = useUpdateRequest(clientId)

  const requests = data ?? []
  const open = requests.filter((r) => r.status === 'requested')

  if (isLoading) return <InlineLoading description="Chargement de la liste…" />

  if (open.length === 0) return null

  return (
    <Tile data-testid="client-checklist" style={{ marginBottom: '1.5rem' }}>
      <h4 className="capsule-section-title">Demandé par votre comptable</h4>
      <StructuredListWrapper isCondensed>
        <StructuredListBody>
          {open.map((r) => (
            <StructuredListRow key={r.id} data-testid={`checklist-${r.id}`}>
              <StructuredListCell>
                {r.category || 'Un document'}
                {r.period_key ? ` pour ${r.period_key}` : ''}
              </StructuredListCell>
              <StructuredListCell>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Button
                    size="sm"
                    onClick={() => navigate('/workspace/upload')}
                    data-testid={`checklist-upload-${r.id}`}
                  >
                    Importer
                  </Button>
                  <Button
                    kind="ghost"
                    size="sm"
                    renderIcon={CheckmarkOutline}
                    data-testid={`checklist-fulfill-${r.id}`}
                    onClick={() =>
                      update.mutate({ id: r.id, status: 'fulfilled' })
                    }
                  >
                    Marquer comme fourni
                  </Button>
                </div>
              </StructuredListCell>
            </StructuredListRow>
          ))}
        </StructuredListBody>
      </StructuredListWrapper>
    </Tile>
  )
}
