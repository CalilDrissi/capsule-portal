import { useNavigate } from 'react-router-dom'
import {
  ActionableNotification,
  Button,
  SkeletonText,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Tile,
} from '@carbon/react'
import { Upload } from '@carbon/icons-react'
import DocumentsTable from '../components/DocumentsTable'
import PeriodGroupedDocuments from '../components/PeriodGroupedDocuments'
import TimelineView from '../components/TimelineView'
import { ClientChecklistPanel } from '../components/RequestsPanel'
import { useCabinets, useCabinetDocuments } from '../api/queries'
import { useAppStore } from '../store/useAppStore'

/**
 * The CLIENT's own workspace: their single (ACL-scoped) cabinet's documents
 * plus an upload action. A client sees exactly one cabinet — their own.
 * Documents are presented flat, grouped by period, and as a timeline.
 */
export default function ClientWorkspaceSelfPage() {
  const navigate = useNavigate()
  const clientId = useAppStore((s) => s.clientId)
  const cabinets = useCabinets()
  const cabinet = cabinets.data?.results?.[0] ?? null
  const docs = useCabinetDocuments(cabinet?.id ?? null)
  const documents = docs.data?.results ?? []
  const loading = cabinets.isLoading || docs.isLoading
  // A failed fetch must NOT masquerade as an empty workspace — surface it
  // distinctly from the true "no documents yet" state.
  const isError = cabinets.isError || docs.isError

  function retry() {
    cabinets.refetch()
    docs.refetch()
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
        <h2 className="capsule-page__title">My documents</h2>
        <Button
          renderIcon={Upload}
          onClick={() => navigate('/workspace/upload')}
          data-testid="workspace-upload"
        >
          Upload
        </Button>
      </div>

      {clientId != null && <ClientChecklistPanel clientId={clientId} />}

      {isError && (
        <ActionableNotification
          kind="error"
          title="Couldn't load your documents"
          subtitle="There was a problem reaching the server."
          actionButtonLabel="Retry"
          onActionButtonClick={retry}
          lowContrast
          hideCloseButton
          data-testid="workspace-error"
        />
      )}

      <Tabs>
        <TabList aria-label="My documents" contained>
          <Tab>All</Tab>
          <Tab>By period</Tab>
          <Tab>Timeline</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            {loading ? (
              <Tile>
                <SkeletonText paragraph lineCount={3} />
              </Tile>
            ) : isError ? null : documents.length === 0 ? (
              <Tile className="capsule-empty" data-testid="workspace-empty">
                <h4>No documents yet</h4>
                <p>Upload your first document to get started.</p>
              </Tile>
            ) : (
              <DocumentsTable
                documents={documents}
                linkBase="/workspace/documents"
                showStatus
              />
            )}
          </TabPanel>
          <TabPanel>
            {loading ? (
              <Tile>
                <SkeletonText paragraph lineCount={3} />
              </Tile>
            ) : isError ? null : (
              <PeriodGroupedDocuments
                documents={documents}
                emptyTestId="workspace-period-empty"
                linkBase="/workspace/documents"
              />
            )}
          </TabPanel>
          <TabPanel>
            {loading ? (
              <Tile>
                <SkeletonText paragraph lineCount={3} />
              </Tile>
            ) : isError ? null : (
              <TimelineView
                documents={documents}
                emptyTestId="workspace-timeline-empty"
              />
            )}
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  )
}
