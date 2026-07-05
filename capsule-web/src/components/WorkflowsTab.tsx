import { useState } from 'react'
import {
  Button,
  Dropdown,
  InlineLoading,
  InlineNotification,
  Stack,
  StructuredListBody,
  StructuredListCell,
  StructuredListHead,
  StructuredListRow,
  StructuredListWrapper,
  Tag,
  TextInput,
  Tile,
} from '@carbon/react'
import { Send } from '@carbon/icons-react'
import {
  useDocumentWorkflows,
  useWorkflowLogEntries,
  useWorkflowTransition,
  useWorkflowTransitions,
} from '../api/queries'
import type { WorkflowInstance, WorkflowTransition } from '../api/types'

function WorkflowHistory({
  docId,
  instanceId,
}: {
  docId: number
  instanceId: number
}) {
  const { data, isLoading } = useWorkflowLogEntries(docId, instanceId)
  if (isLoading) return <InlineLoading description="Loading history…" />
  const entries = data?.results ?? []
  if (entries.length === 0)
    return <Tile data-testid="wf-history-empty">No transitions yet.</Tile>

  return (
    <StructuredListWrapper isCondensed data-testid="wf-history">
      <StructuredListHead>
        <StructuredListRow head>
          <StructuredListCell head>When</StructuredListCell>
          <StructuredListCell head>Transition</StructuredListCell>
          <StructuredListCell head>To state</StructuredListCell>
          <StructuredListCell head>User</StructuredListCell>
          <StructuredListCell head>Comment</StructuredListCell>
        </StructuredListRow>
      </StructuredListHead>
      <StructuredListBody>
        {entries.map((e) => (
          <StructuredListRow key={e.id}>
            <StructuredListCell>
              {e.datetime ? new Date(e.datetime).toLocaleString() : '—'}
            </StructuredListCell>
            <StructuredListCell>{e.transition?.label ?? '—'}</StructuredListCell>
            <StructuredListCell>
              {e.transition?.destination_state?.label ?? '—'}
            </StructuredListCell>
            <StructuredListCell>{e.user?.username ?? '—'}</StructuredListCell>
            <StructuredListCell>{e.comment || '—'}</StructuredListCell>
          </StructuredListRow>
        ))}
      </StructuredListBody>
    </StructuredListWrapper>
  )
}

function WorkflowInstanceCard({
  docId,
  instance,
  canTransition,
}: {
  docId: number
  instance: WorkflowInstance
  canTransition: boolean
}) {
  const templateId = instance.workflow_template?.id ?? null
  const { data: transitionsData } = useWorkflowTransitions(templateId)
  const transition = useWorkflowTransition(docId, instance.id)

  const currentStateId = instance.current_state?.id
  // Available transitions are those whose origin matches the current state.
  const available: WorkflowTransition[] = (
    transitionsData?.results ?? []
  ).filter((t) => t.origin_state?.id === currentStateId)

  const [selected, setSelected] = useState<WorkflowTransition | null>(null)
  const [comment, setComment] = useState('')

  const chosen = selected ?? available[0] ?? null

  return (
    <Tile data-testid={`wf-instance-${instance.id}`}>
      <Stack gap={5}>
        <div className="capsule-wf-header">
          <h4 className="capsule-section-title">
            {instance.workflow_template?.label ?? 'Workflow'}
          </h4>
          <Tag type="blue" data-testid={`wf-state-${instance.id}`}>
            {instance.current_state?.label ?? 'No state'}
            {instance.current_state?.completion != null
              ? ` · ${instance.current_state.completion}%`
              : ''}
          </Tag>
        </div>

        {!canTransition ? (
          // Clients see the workflow state read-only — they cannot drive
          // transitions (the server ACL also rejects the attempt).
          <InlineNotification
            kind="info"
            lowContrast
            hideCloseButton
            title="Read-only"
            subtitle="Your accountant manages this document's status."
          />
        ) : available.length > 0 ? (
          <div className="capsule-wf-transition">
            <Dropdown
              id={`wf-transition-${instance.id}`}
              titleText="Transition"
              label="Choose a transition"
              data-testid={`wf-transition-dd-${instance.id}`}
              items={available}
              selectedItem={chosen}
              itemToString={(t) => (t ? t.label : '')}
              onChange={({ selectedItem }) => setSelected(selectedItem ?? null)}
            />
            <TextInput
              id={`wf-comment-${instance.id}`}
              labelText="Comment (optional)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <Button
              renderIcon={Send}
              disabled={!chosen || transition.isPending}
              data-testid={`wf-do-transition-${instance.id}`}
              onClick={() =>
                chosen &&
                transition.mutate(
                  {
                    transition_id: chosen.id,
                    comment: comment.trim() || undefined,
                  },
                  {
                    onSuccess: () => {
                      setComment('')
                      setSelected(null)
                    },
                  },
                )
              }
            >
              Apply transition
            </Button>
          </div>
        ) : (
          <InlineNotification
            kind="info"
            lowContrast
            hideCloseButton
            title="No transitions"
            subtitle="This workflow has no available transitions from its current state."
          />
        )}

        {transition.isError && (
          <InlineNotification
            kind="error"
            lowContrast
            title="Transition failed"
            subtitle={(transition.error as Error)?.message}
          />
        )}

        <div>
          <h5 className="capsule-section-subtitle">History</h5>
          <WorkflowHistory docId={docId} instanceId={instance.id} />
        </div>
      </Stack>
    </Tile>
  )
}

/**
 * Workflow instances running on a document, with the ability to transition.
 * GET  /documents/{id}/workflow_instances/
 * POST /documents/{id}/workflow_instances/{wid}/log_entries/ {transition_id}
 */
export default function WorkflowsTab({
  docId,
  canTransition = true,
}: {
  docId: number
  canTransition?: boolean
}) {
  const { data, isLoading } = useDocumentWorkflows(docId)
  if (isLoading) return <InlineLoading description="Loading workflows…" />

  const instances = data?.results ?? []
  if (instances.length === 0)
    return (
      <Tile data-testid="wf-empty">
        This document has no active workflows. Workflows launch automatically
        when their template is assigned to the document type.
      </Tile>
    )

  return (
    <Stack gap={6} data-testid="workflows-tab">
      {instances.map((inst) => (
        <WorkflowInstanceCard
          key={inst.id}
          docId={docId}
          instance={inst}
          canTransition={canTransition}
        />
      ))}
    </Stack>
  )
}
