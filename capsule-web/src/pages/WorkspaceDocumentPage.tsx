import { useParams } from 'react-router-dom'
import {
  InlineNotification,
  SkeletonText,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Tile,
} from '@carbon/react'
import PageBreadcrumb from '../components/PageBreadcrumb'
import DocumentViewer from '../components/DocumentViewer'
import CommentsTab from '../components/CommentsTab'
import WorkflowsTab from '../components/WorkflowsTab'
import { useDocument } from '../api/queries'
import { useAppStore } from '../store/useAppStore'

/**
 * A role-reachable document view for the workspace flows. Shows the document's
 * status (the Capsule status workflow — accountants get transition controls,
 * clients see the state read-only because the transition list is ACL-filtered)
 * and the accountant<->client comment thread.
 *
 * Reachable by BOTH the client (`/workspace/documents/:id`) and the accountant
 * (`/clients/:cid/documents/:id`) so notes + status are shared per document.
 */
export default function WorkspaceDocumentPage() {
  const { id, cid } = useParams()
  const docId = id ? Number(id) : null
  const role = useAppStore((s) => s.role)
  const { data: doc, isLoading, isError } = useDocument(docId)

  const backCrumb =
    role === 'client'
      ? { label: 'My documents', to: '/workspace' }
      : cid
        ? { label: 'Client', to: `/clients/${cid}` }
        : { label: 'Clients', to: '/clients' }

  if (isLoading) {
    return (
      <div className="capsule-page">
        <Tile>
          <SkeletonText paragraph lineCount={3} />
        </Tile>
      </div>
    )
  }

  if (isError || !doc) {
    return (
      <div className="capsule-page">
        <PageBreadcrumb items={[backCrumb, { label: 'Not found' }]} />
        <InlineNotification
          kind="error"
          title="Document not found"
          subtitle="You may not have access to this document."
          lowContrast
          hideCloseButton
        />
      </div>
    )
  }

  return (
    <div className="capsule-page">
      <PageBreadcrumb items={[backCrumb, { label: doc.label }]} />
      <h2 className="capsule-page__title">{doc.label}</h2>

      <Tabs>
        <TabList aria-label="Document" contained>
          <Tab>Document</Tab>
          <Tab>Status</Tab>
          <Tab>Comments</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <DocumentViewer doc={doc} />
          </TabPanel>
          <TabPanel>
            <div data-testid="workspace-doc-status">
              <WorkflowsTab docId={doc.id} canTransition={role !== 'client'} />
            </div>
          </TabPanel>
          <TabPanel>
            <div data-testid="workspace-doc-comments">
              <CommentsTab docId={doc.id} />
            </div>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  )
}
