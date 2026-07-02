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
      {status === 'fulfilled' ? 'Fulfilled' : 'Open'}
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
          Request documents
        </Button>
      </div>

      {isLoading ? (
        <InlineLoading description="Loading requests…" />
      ) : requests.length === 0 ? (
        <Tile className="capsule-empty" data-testid="requests-empty">
          <h4>No requests yet</h4>
          <p>Request a document to add it to the client&apos;s checklist.</p>
        </Tile>
      ) : (
        <StructuredListWrapper isCondensed data-testid="requests-list">
          <StructuredListHead>
            <StructuredListRow head>
              <StructuredListCell head>Category</StructuredListCell>
              <StructuredListCell head>Period</StructuredListCell>
              <StructuredListCell head>Status</StructuredListCell>
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
                      Mark fulfilled
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
        modalHeading="Request a document"
        primaryButtonText={create.isPending ? 'Requesting…' : 'Request'}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={create.isPending}
        onRequestClose={() => setOpen(false)}
        onRequestSubmit={submit}
      >
        <Form onSubmit={(e) => e.preventDefault()}>
          <Stack gap={5}>
            <Dropdown
              id="request-category"
              titleText="Category"
              label="Choose a category"
              items={categories}
              selectedItem={category}
              itemToString={(i) => i ?? ''}
              onChange={({ selectedItem }) => setCategory(selectedItem ?? null)}
            />
            <TextInput
              id="request-period"
              labelText="Period (e.g. 2026-06 or 2026)"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              data-testid="request-period"
            />
            <TextArea
              id="request-note"
              labelText="Note (optional)"
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

  if (isLoading) return <InlineLoading description="Loading checklist…" />

  if (open.length === 0) return null

  return (
    <Tile data-testid="client-checklist" style={{ marginBottom: '1.5rem' }}>
      <h4 className="capsule-section-title">Requested by your accountant</h4>
      <StructuredListWrapper isCondensed>
        <StructuredListBody>
          {open.map((r) => (
            <StructuredListRow key={r.id} data-testid={`checklist-${r.id}`}>
              <StructuredListCell>
                {r.category || 'A document'}
                {r.period_key ? ` for ${r.period_key}` : ''}
              </StructuredListCell>
              <StructuredListCell>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Button
                    size="sm"
                    onClick={() => navigate('/workspace/upload')}
                    data-testid={`checklist-upload-${r.id}`}
                  >
                    Upload
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
                    Mark provided
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
