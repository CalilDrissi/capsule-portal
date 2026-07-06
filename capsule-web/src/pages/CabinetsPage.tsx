import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  DataTable,
  DataTableSkeleton,
  Modal,
  OverflowMenu,
  OverflowMenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  TextInput,
  Tile,
} from '@carbon/react'
import { Add } from '@carbon/icons-react'
import {
  useCabinets,
  useCreateCabinet,
  useDeleteCabinet,
  useUpdateCabinet,
} from '../api/queries'
import { requiredLabel } from '../lib/forms'
import type { Cabinet } from '../api/types'

const headers = [
  { key: 'label', header: 'Libellé' },
  { key: 'path', header: 'Chemin complet' },
  { key: 'children', header: 'Sous-classeurs' },
  { key: 'actions', header: '' },
]

export default function CabinetsPage() {
  const navigate = useNavigate()
  const { data, isLoading, isError, error } = useCabinets()
  const createCabinet = useCreateCabinet()
  const updateCabinet = useUpdateCabinet()
  const deleteCabinet = useDeleteCabinet()

  const [createOpen, setCreateOpen] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [createAttempted, setCreateAttempted] = useState(false)
  const [editCabinet, setEditCabinet] = useState<Cabinet | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [editAttempted, setEditAttempted] = useState(false)

  const cabinets = data?.results ?? []

  // Field-level validity (only surfaced after a save attempt).
  const createLabelInvalid = createAttempted && !newLabel.trim()
  const editLabelInvalid = editAttempted && !editLabel.trim()

  function openCreate() {
    setNewLabel('')
    setCreateAttempted(false)
    setCreateOpen(true)
  }

  function openEdit(cab: Cabinet) {
    setEditCabinet(cab)
    setEditLabel(cab.label)
    setEditAttempted(false)
  }

  function submitCreate() {
    setCreateAttempted(true)
    const label = newLabel.trim()
    if (!label) return
    createCabinet.mutate(
      { label, parent: null },
      {
        onSuccess: () => {
          setCreateOpen(false)
          setNewLabel('')
        },
      },
    )
  }

  function submitEdit() {
    if (!editCabinet) return
    setEditAttempted(true)
    const label = editLabel.trim()
    if (!label) return
    updateCabinet.mutate(
      { id: editCabinet.id, label },
      { onSuccess: () => setEditCabinet(null) },
    )
  }

  const rows = cabinets.map((c) => ({
    id: String(c.id),
    label: c.label,
    path: c.full_path,
    children: String(c.children?.length ?? 0),
  }))

  return (
    <div className="capsule-page">
      <div className="capsule-page__header">
        <h2 className="capsule-page__title">Classeurs</h2>
        <Button
          renderIcon={Add}
          onClick={openCreate}
          data-testid="new-cabinet"
        >
          Nouveau classeur
        </Button>
      </div>

      {isLoading ? (
        <DataTableSkeleton columnCount={4} rowCount={5} showHeader={false} />
      ) : isError ? (
        <Tile>Échec du chargement des classeurs : {(error as Error)?.message}</Tile>
      ) : cabinets.length === 0 ? (
        <Tile className="capsule-empty">
          <h4>Aucun classeur pour le moment</h4>
          <p>Créez un classeur pour commencer à organiser vos documents.</p>
          <Button renderIcon={Add} onClick={openCreate}>
            Nouveau classeur
          </Button>
        </Tile>
      ) : (
        <DataTable rows={rows} headers={headers} isSortable>
          {({ rows, headers, getHeaderProps, getTableProps }) => (
            <TableContainer>
              <Table {...getTableProps()}>
                <TableHead>
                  <TableRow>
                    {headers.map((header) => {
                      const { key, ...rest } = getHeaderProps({ header })
                      return (
                        <TableHeader key={key} {...rest}>
                          {header.header}
                        </TableHeader>
                      )
                    })}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row) => {
                    const cab = cabinets.find((c) => String(c.id) === row.id)
                    return (
                      <TableRow key={row.id}>
                        {row.cells.map((cell) =>
                          cell.info.header === 'actions' ? (
                            <TableCell key={cell.id}>
                              <OverflowMenu
                                aria-label="Actions du classeur"
                                flipped
                                onClick={(e: React.MouseEvent) =>
                                  e.stopPropagation()
                                }
                              >
                                <OverflowMenuItem
                                  itemText="Ouvrir"
                                  onClick={() =>
                                    navigate(`/cabinets/${row.id}`)
                                  }
                                />
                                <OverflowMenuItem
                                  itemText="Renommer"
                                  onClick={() => {
                                    if (cab) openEdit(cab)
                                  }}
                                />
                                <OverflowMenuItem
                                  hasDivider
                                  isDelete
                                  itemText="Supprimer"
                                  onClick={() => deleteCabinet.mutate(Number(row.id))}
                                />
                              </OverflowMenu>
                            </TableCell>
                          ) : (
                            <TableCell
                              key={cell.id}
                              onClick={() => navigate(`/cabinets/${row.id}`)}
                              style={{ cursor: 'pointer' }}
                            >
                              {cell.value}
                            </TableCell>
                          ),
                        )}
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DataTable>
      )}

      <Modal
        open={createOpen}
        modalHeading="Nouveau classeur"
        primaryButtonText="Créer"
        secondaryButtonText="Annuler"
        primaryButtonDisabled={createCabinet.isPending}
        onRequestClose={() => setCreateOpen(false)}
        onRequestSubmit={submitCreate}
      >
        <TextInput
          id="new-cabinet-label"
          data-testid="cabinet-label-input"
          labelText={requiredLabel('Libellé')}
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          invalid={createLabelInvalid}
          invalidText="Le libellé est obligatoire."
          onKeyDown={(e) => {
            if (e.key === 'Enter') submitCreate()
          }}
        />
        {createCabinet.isError && (
          <p className="capsule-error">
            {(createCabinet.error as Error)?.message}
          </p>
        )}
      </Modal>

      <Modal
        open={!!editCabinet}
        modalHeading="Renommer le classeur"
        primaryButtonText="Enregistrer"
        secondaryButtonText="Annuler"
        primaryButtonDisabled={updateCabinet.isPending}
        onRequestClose={() => setEditCabinet(null)}
        onRequestSubmit={submitEdit}
      >
        <TextInput
          id="edit-cabinet-label"
          labelText={requiredLabel('Libellé')}
          value={editLabel}
          onChange={(e) => setEditLabel(e.target.value)}
          invalid={editLabelInvalid}
          invalidText="Le libellé est obligatoire."
          onKeyDown={(e) => {
            if (e.key === 'Enter') submitEdit()
          }}
        />
      </Modal>
    </div>
  )
}
