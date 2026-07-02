import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import {
  InlineNotification,
  SkeletonText,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Tile,
} from '@carbon/react'
import PageBreadcrumb from '../components/PageBreadcrumb'
import DocumentsTable from '../components/DocumentsTable'
import PeriodGroupedDocuments from '../components/PeriodGroupedDocuments'
import TimelineView from '../components/TimelineView'
import ExportPeriodButton from '../components/ExportPeriodButton'
import { AccountantRequestsPanel } from '../components/RequestsPanel'
import { useCabinetDocuments, useClient } from '../api/queries'
import { useAppStore } from '../store/useAppStore'

/** Accountant's view of one client: their documents + status/requests/export. */
export default function ClientWorkspacePage() {
  const { id } = useParams()
  const clientId = id ? Number(id) : null
  const setActiveClientId = useAppStore((s) => s.setActiveClientId)
  const { client, isLoading: clientLoading } = useClient(clientId)
  const docs = useCabinetDocuments(client?.cabinet_id ?? null)

  useEffect(() => {
    setActiveClientId(clientId)
    return () => setActiveClientId(null)
  }, [clientId, setActiveClientId])

  if (clientLoading) {
    return (
      <div className="capsule-page">
        <Tile>
          <SkeletonText paragraph lineCount={3} />
        </Tile>
      </div>
    )
  }

  if (!client) {
    return (
      <div className="capsule-page">
        <PageBreadcrumb items={[{ label: 'Clients', to: '/clients' }, { label: 'Not found' }]} />
        <InlineNotification
          kind="error"
          title="Client not found"
          lowContrast
          hideCloseButton
        />
      </div>
    )
  }

  const documents = docs.data?.results ?? []
  // Route document clicks to the role-reachable workspace document view.
  const linkBase = `/clients/${client.id}/documents`

  return (
    <div className="capsule-page">
      <PageBreadcrumb
        items={[
          { label: 'Clients', to: '/clients' },
          { label: client.display_name },
        ]}
      />
      <h2 className="capsule-page__title">{client.display_name}</h2>

      <Tabs>
        <TabList aria-label="Client workspace" contained>
          <Tab>Documents</Tab>
          <Tab>By period</Tab>
          <Tab>Timeline</Tab>
          <Tab>Requests</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            {docs.isLoading ? (
              <Tile>
                <SkeletonText paragraph lineCount={3} />
              </Tile>
            ) : documents.length === 0 ? (
              <Tile className="capsule-empty" data-testid="client-docs-empty">
                <h4>No documents yet</h4>
                <p>This client has not uploaded any documents.</p>
              </Tile>
            ) : (
              <DocumentsTable
                documents={documents}
                linkBase={linkBase}
                showStatus
              />
            )}
          </TabPanel>
          <TabPanel>
            {docs.isLoading ? (
              <Tile>
                <SkeletonText paragraph lineCount={3} />
              </Tile>
            ) : (
              <Stack gap={6}>
                <ExportPeriodButton clientId={client.id} />
                <PeriodGroupedDocuments
                  documents={documents}
                  emptyTestId="client-period-empty"
                  linkBase={linkBase}
                />
              </Stack>
            )}
          </TabPanel>
          <TabPanel>
            {docs.isLoading ? (
              <Tile>
                <SkeletonText paragraph lineCount={3} />
              </Tile>
            ) : (
              <TimelineView
                documents={documents}
                interactive
                emptyTestId="client-timeline-empty"
              />
            )}
          </TabPanel>
          <TabPanel>
            <AccountantRequestsPanel clientId={client.id} />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  )
}
