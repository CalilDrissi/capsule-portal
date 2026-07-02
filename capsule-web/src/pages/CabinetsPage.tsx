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
import type { Cabinet } from '../api/types'

const headers = [
  { key: 'label', header: 'Label' },
  { key: 'path', header: 'Full path' },
  { key: 'children', header: 'Sub-cabinets' },
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
  const [editCabinet, setEditCabinet] = useState<Cabinet | null>(null)
  const [editLabel, setEditLabel] = useState('')

  const cabinets = data?.results ?? []

  function submitCreate() {
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
        <h2 className="capsule-page__title">Cabinets</h2>
        <Button
          renderIcon={Add}
          onClick={() => setCreateOpen(true)}
          data-testid="new-cabinet"
        >
          New cabinet
        </Button>
      </div>

      {isLoading ? (
        <DataTableSkeleton columnCount={4} rowCount={5} showHeader={false} />
      ) : isError ? (
        <Tile>Failed to load cabinets: {(error as Error)?.message}</Tile>
      ) : cabinets.length === 0 ? (
        <Tile className="capsule-empty">
          <h4>No cabinets yet</h4>
          <p>Create a cabinet to start organizing your documents.</p>
          <Button renderIcon={Add} onClick={() => setCreateOpen(true)}>
            New cabinet
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
                                aria-label="Cabinet actions"
                                flipped
                                onClick={(e: React.MouseEvent) =>
                                  e.stopPropagation()
                                }
                              >
                                <OverflowMenuItem
                                  itemText="Open"
                                  onClick={() =>
                                    navigate(`/cabinets/${row.id}`)
                                  }
                                />
                                <OverflowMenuItem
                                  itemText="Rename"
                                  onClick={() => {
                                    if (cab) {
                                      setEditCabinet(cab)
                                      setEditLabel(cab.label)
                                    }
                                  }}
                                />
                                <OverflowMenuItem
                                  hasDivider
                                  isDelete
                                  itemText="Delete"
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
        modalHeading="New cabinet"
        primaryButtonText="Create"
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!newLabel.trim() || createCabinet.isPending}
        onRequestClose={() => setCreateOpen(false)}
        onRequestSubmit={submitCreate}
      >
        <TextInput
          id="new-cabinet-label"
          data-testid="cabinet-label-input"
          labelText="Label"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
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
        modalHeading="Rename cabinet"
        primaryButtonText="Save"
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!editLabel.trim() || updateCabinet.isPending}
        onRequestClose={() => setEditCabinet(null)}
        onRequestSubmit={submitEdit}
      >
        <TextInput
          id="edit-cabinet-label"
          labelText="Label"
          value={editLabel}
          onChange={(e) => setEditLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submitEdit()
          }}
        />
      </Modal>
    </div>
  )
}
