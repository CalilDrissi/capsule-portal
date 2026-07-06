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
import ClientManageTab from '../components/ClientManageTab'
import AccountantUploadModal from '../components/AccountantUploadModal'
import { AccountantRequestsPanel } from '../components/RequestsPanel'
import {
  useCabinetDocuments,
  useClient,
  useClientDocumentUploaders,
} from '../api/queries'
import { useAppStore } from '../store/useAppStore'

/** Accountant's view of one client: their documents + status/requests/export. */
export default function ClientWorkspacePage() {
  const { id } = useParams()
  const clientId = id ? Number(id) : null
  const setActiveClientId = useAppStore((s) => s.setActiveClientId)
  const { client, isLoading: clientLoading } = useClient(clientId)
  const docs = useCabinetDocuments(client?.cabinet_id ?? null)
  const uploaders = useClientDocumentUploaders(clientId)

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
        <PageBreadcrumb items={[{ label: 'Clients', to: '/clients' }, { label: 'Introuvable' }]} />
        <InlineNotification
          kind="error"
          title="Client introuvable"
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
        <TabList aria-label="Espace de travail du client" contained>
          <Tab>Documents</Tab>
          <Tab>Par période</Tab>
          <Tab>Chronologie</Tab>
          <Tab>Demandes</Tab>
          <Tab>Client</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                marginBottom: '1rem',
              }}
            >
              <AccountantUploadModal
                clientId={client.id}
                onUploaded={() => {
                  docs.refetch()
                  uploaders.refetch()
                }}
              />
            </div>
            {docs.isLoading ? (
              <Tile>
                <SkeletonText paragraph lineCount={3} />
              </Tile>
            ) : documents.length === 0 ? (
              <Tile className="capsule-empty" data-testid="client-docs-empty">
                <h4>Aucun document pour l'instant</h4>
                <p>
                  Ce client n'a importé aucun document. Vous pouvez en importer
                  un pour lui à l'aide du bouton ci-dessus.
                </p>
              </Tile>
            ) : (
              <DocumentsTable
                documents={documents}
                linkBase={linkBase}
                showStatus
                uploaders={uploaders.data}
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
          <TabPanel>
            <ClientManageTab clientId={client.id} />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  )
}
