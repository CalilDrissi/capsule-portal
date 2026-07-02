import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Button,
  ComboBox,
  DataTableSkeleton,
  Loading,
  Modal,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tile,
  TreeNode,
  TreeView,
} from '@carbon/react'
import { Add, Folder, FolderAdd, TrashCan } from '@carbon/icons-react'
import PageBreadcrumb from '../components/PageBreadcrumb'
import {
  useAddDocumentToCabinet,
  useCabinet,
  useCabinetDocuments,
  useCreateCabinet,
  useDocuments,
  useRemoveDocumentFromCabinet,
} from '../api/queries'
import type { Cabinet } from '../api/types'

function renderTree(
  nodes: Cabinet[],
  activeId: number,
  navigate: (path: string) => void,
) {
  return nodes.map((n) => (
    <TreeNode
      key={n.id}
      id={`cab-${n.id}`}
      label={n.label}
      renderIcon={Folder}
      isExpanded
      onSelect={() => navigate(`/cabinets/${n.id}`)}
      {...(n.id === activeId ? { 'aria-current': 'page' } : {})}
    >
      {n.children && n.children.length > 0
        ? renderTree(n.children, activeId, navigate)
        : undefined}
    </TreeNode>
  ))
}

export default function CabinetDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const cabinetId = id ? Number(id) : null

  const { data: cabinet, isLoading, isError } = useCabinet(cabinetId)
  const { data: docsData, isLoading: docsLoading } =
    useCabinetDocuments(cabinetId)
  const { data: allDocs } = useDocuments(1, 100)

  const addDoc = useAddDocumentToCabinet()
  const removeDoc = useRemoveDocumentFromCabinet()
  const createCabinet = useCreateCabinet()

  const [addOpen, setAddOpen] = useState(false)
  const [selectedDocId, setSelectedDocId] = useState<number | null>(null)
  const [childOpen, setChildOpen] = useState(false)
  const [childLabel, setChildLabel] = useState('')

  // The detail endpoint returns the subtree rooted here; for the breadcrumb /
  // full hierarchy we render the tree starting from this cabinet's node.
  const treeRoot = useMemo<Cabinet[]>(() => {
    if (!cabinet) return []
    return [cabinet]
  }, [cabinet])

  const docs = docsData?.results ?? []
  const docsInCabinet = new Set(docs.map((d) => d.id))
  const candidateDocs = (allDocs?.results ?? []).filter(
    (d) => !docsInCabinet.has(d.id),
  )

  if (isLoading) return <Loading withOverlay={false} />
  if (isError || !cabinet)
    return (
      <div className="capsule-page">
        <PageBreadcrumb items={[{ label: 'Cabinets', to: '/cabinets' }, { label: 'Not found' }]} />
        <Tile>Cabinet not found.</Tile>
      </div>
    )

  function submitAdd() {
    if (cabinetId == null || selectedDocId == null) return
    addDoc.mutate(
      { cabinetId, documentId: selectedDocId },
      {
        onSuccess: () => {
          setAddOpen(false)
          setSelectedDocId(null)
        },
      },
    )
  }

  function submitChild() {
    if (cabinetId == null) return
    const label = childLabel.trim()
    if (!label) return
    createCabinet.mutate(
      { label, parent: cabinetId },
      {
        onSuccess: () => {
          setChildOpen(false)
          setChildLabel('')
        },
      },
    )
  }

  return (
    <div className="capsule-page">
      <PageBreadcrumb items={[{ label: 'Cabinets', to: '/cabinets' }, { label: cabinet.full_path }]} />

      <div className="capsule-page__header">
        <h2 className="capsule-page__title">{cabinet.full_path}</h2>
        <div className="capsule-actions">
          <Button
            kind="tertiary"
            renderIcon={FolderAdd}
            onClick={() => setChildOpen(true)}
            data-testid="new-subcabinet"
          >
            New sub-cabinet
          </Button>
          <Button
            renderIcon={Add}
            onClick={() => setAddOpen(true)}
            data-testid="add-doc-to-cabinet"
          >
            Add document
          </Button>
        </div>
      </div>

      <div className="capsule-detail capsule-detail--browse">
        <div className="capsule-meta" data-testid="cabinet-tree">
          <h4 style={{ marginBottom: '0.5rem' }}>Hierarchy</h4>
          <TreeView label="Cabinet hierarchy" hideLabel>
            {renderTree(treeRoot, cabinet.id, navigate)}
          </TreeView>
        </div>

        <div style={{ flex: 1 }}>
          <h4 style={{ marginBottom: '0.5rem' }}>Documents</h4>
          {docsLoading ? (
            <DataTableSkeleton
              columnCount={3}
              rowCount={4}
              showHeader={false}
            />
          ) : docs.length === 0 ? (
            <Tile className="capsule-empty">
              <p>No documents in this cabinet.</p>
            </Tile>
          ) : (
            <TableContainer>
              <Table data-testid="cabinet-docs">
                <TableHead>
                  <TableRow>
                    <TableHeader>Label</TableHeader>
                    <TableHeader>Type</TableHeader>
                    <TableHeader>Created</TableHeader>
                    <TableHeader> </TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {docs.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell
                        onClick={() => navigate(`/documents/${d.id}`)}
                        style={{ cursor: 'pointer' }}
                      >
                        {d.label}
                      </TableCell>
                      <TableCell>{d.document_type?.label ?? '—'}</TableCell>
                      <TableCell>
                        {d.datetime_created
                          ? new Date(d.datetime_created).toLocaleString()
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <Button
                          hasIconOnly
                          kind="ghost"
                          size="sm"
                          iconDescription="Remove from cabinet"
                          renderIcon={TrashCan}
                          disabled={removeDoc.isPending}
                          data-testid={`remove-doc-${d.id}`}
                          onClick={() =>
                            cabinetId != null &&
                            removeDoc.mutate({
                              cabinetId,
                              documentId: d.id,
                            })
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </div>
      </div>

      <Modal
        open={addOpen}
        modalHeading="Add document to cabinet"
        primaryButtonText="Add"
        secondaryButtonText="Cancel"
        primaryButtonDisabled={selectedDocId == null || addDoc.isPending}
        onRequestClose={() => setAddOpen(false)}
        onRequestSubmit={submitAdd}
      >
        <ComboBox
          id="add-doc-combo"
          data-testid="add-doc-combo"
          titleText="Document"
          placeholder="Search documents…"
          items={candidateDocs}
          itemToString={(d) => (d ? d.label : '')}
          onChange={({ selectedItem }) =>
            setSelectedDocId(selectedItem ? selectedItem.id : null)
          }
        />
        {addDoc.isError && (
          <p className="capsule-error">{(addDoc.error as Error)?.message}</p>
        )}
      </Modal>

      <Modal
        open={childOpen}
        modalHeading="New sub-cabinet"
        primaryButtonText="Create"
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!childLabel.trim() || createCabinet.isPending}
        onRequestClose={() => setChildOpen(false)}
        onRequestSubmit={submitChild}
      >
        <p style={{ marginBottom: '0.5rem' }}>
          Parent: <strong>{cabinet.full_path}</strong>
        </p>
        <input
          className="cds--text-input"
          aria-label="Sub-cabinet label"
          value={childLabel}
          onChange={(e) => setChildLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submitChild()
          }}
          placeholder="Label"
        />
      </Modal>
    </div>
  )
}
