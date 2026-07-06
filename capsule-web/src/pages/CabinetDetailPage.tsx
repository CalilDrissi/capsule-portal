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
  TextInput,
  Tile,
  TreeNode,
  TreeView,
} from '@carbon/react'
import { Add, Folder, FolderAdd, TrashCan } from '@carbon/icons-react'
import PageBreadcrumb from '../components/PageBreadcrumb'
import { requiredLabel } from '../lib/forms'
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
  const [childAttempted, setChildAttempted] = useState(false)

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
        <PageBreadcrumb items={[{ label: 'Classeurs', to: '/cabinets' }, { label: 'Introuvable' }]} />
        <Tile>Classeur introuvable.</Tile>
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

  function openChild() {
    setChildLabel('')
    setChildAttempted(false)
    setChildOpen(true)
  }

  function submitChild() {
    if (cabinetId == null) return
    setChildAttempted(true)
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

  // Field-level validity (only surfaced after a save attempt).
  const childLabelInvalid = childAttempted && !childLabel.trim()

  return (
    <div className="capsule-page">
      <PageBreadcrumb items={[{ label: 'Classeurs', to: '/cabinets' }, { label: cabinet.full_path }]} />

      <div className="capsule-page__header">
        <h2 className="capsule-page__title">{cabinet.full_path}</h2>
        <div className="capsule-actions">
          <Button
            kind="tertiary"
            renderIcon={FolderAdd}
            onClick={openChild}
            data-testid="new-subcabinet"
          >
            Nouveau sous-classeur
          </Button>
          <Button
            renderIcon={Add}
            onClick={() => setAddOpen(true)}
            data-testid="add-doc-to-cabinet"
          >
            Ajouter un document
          </Button>
        </div>
      </div>

      <div className="capsule-detail capsule-detail--browse">
        <div className="capsule-meta" data-testid="cabinet-tree">
          <h4 style={{ marginBottom: '0.5rem' }}>Hiérarchie</h4>
          <TreeView label="Hiérarchie des classeurs" hideLabel>
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
              <p>Aucun document dans ce classeur.</p>
            </Tile>
          ) : (
            <TableContainer>
              <Table data-testid="cabinet-docs">
                <TableHead>
                  <TableRow>
                    <TableHeader>Libellé</TableHeader>
                    <TableHeader>Type</TableHeader>
                    <TableHeader>Créé le</TableHeader>
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
                          ? new Date(d.datetime_created).toLocaleString('fr-FR')
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <Button
                          hasIconOnly
                          kind="ghost"
                          size="sm"
                          iconDescription="Retirer du classeur"
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
        modalHeading="Ajouter un document au classeur"
        primaryButtonText="Ajouter"
        secondaryButtonText="Annuler"
        primaryButtonDisabled={selectedDocId == null || addDoc.isPending}
        onRequestClose={() => setAddOpen(false)}
        onRequestSubmit={submitAdd}
      >
        <ComboBox
          id="add-doc-combo"
          data-testid="add-doc-combo"
          titleText="Document"
          placeholder="Rechercher des documents…"
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
        modalHeading="Nouveau sous-classeur"
        primaryButtonText="Créer"
        secondaryButtonText="Annuler"
        primaryButtonDisabled={createCabinet.isPending}
        onRequestClose={() => setChildOpen(false)}
        onRequestSubmit={submitChild}
      >
        <p style={{ marginBottom: '0.5rem' }}>
          Parent : <strong>{cabinet.full_path}</strong>
        </p>
        <TextInput
          id="new-subcabinet-label"
          labelText={requiredLabel('Libellé du sous-classeur')}
          value={childLabel}
          onChange={(e) => setChildLabel(e.target.value)}
          invalid={childLabelInvalid}
          invalidText="Le libellé du sous-classeur est obligatoire."
          onKeyDown={(e) => {
            if (e.key === 'Enter') submitChild()
          }}
          placeholder="Libellé"
        />
      </Modal>
    </div>
  )
}
