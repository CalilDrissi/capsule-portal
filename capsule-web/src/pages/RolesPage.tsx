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
  useCreateRole,
  useDeleteRole,
  useRoles,
  useUpdateRole,
} from '../api/queries'
import { requiredLabel } from '../lib/forms'
import type { Role } from '../api/types'

const headers = [
  { key: 'label', header: 'Libellé' },
  { key: 'actions', header: '' },
]

export default function RolesPage() {
  const navigate = useNavigate()
  const { data, isLoading, isError, error } = useRoles()
  const createRole = useCreateRole()
  const updateRole = useUpdateRole()
  const deleteRole = useDeleteRole()

  const [createOpen, setCreateOpen] = useState(false)
  const [createAttempted, setCreateAttempted] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [editRole, setEditRole] = useState<Role | null>(null)
  const [editAttempted, setEditAttempted] = useState(false)
  const [editLabel, setEditLabel] = useState('')

  const roles = data?.results ?? []

  const newLabelInvalid = createAttempted && !newLabel.trim()
  const editLabelInvalid = editAttempted && !editLabel.trim()

  function openCreate() {
    setNewLabel('')
    setCreateAttempted(false)
    setCreateOpen(true)
  }

  function submitCreate() {
    setCreateAttempted(true)
    const label = newLabel.trim()
    if (!label) return
    createRole.mutate(
      { label },
      {
        onSuccess: () => {
          setCreateOpen(false)
          setNewLabel('')
        },
      },
    )
  }

  function submitEdit() {
    if (!editRole) return
    setEditAttempted(true)
    const label = editLabel.trim()
    if (!label) return
    updateRole.mutate(
      { id: editRole.id, label },
      { onSuccess: () => setEditRole(null) },
    )
  }

  const rows = roles.map((r) => ({ id: String(r.id), label: r.label }))

  return (
    <div className="capsule-page">
      <div className="capsule-page__header">
        <h2 className="capsule-page__title">Rôles</h2>
        <Button renderIcon={Add} onClick={openCreate} data-testid="new-role">
          Nouveau rôle
        </Button>
      </div>

      {isLoading ? (
        <DataTableSkeleton columnCount={2} rowCount={5} showHeader={false} />
      ) : isError ? (
        <Tile>Échec du chargement des rôles : {(error as Error)?.message}</Tile>
      ) : roles.length === 0 ? (
        <Tile className="capsule-empty">
          <h4>Aucun rôle pour le moment</h4>
          <p>Les rôles regroupent des permissions et sont attribués aux groupes.</p>
          <Button renderIcon={Add} onClick={openCreate}>
            Nouveau rôle
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
                    const role = roles.find((r) => String(r.id) === row.id)
                    return (
                      <TableRow key={row.id}>
                        {row.cells.map((cell) =>
                          cell.info.header === 'actions' ? (
                            <TableCell key={cell.id}>
                              <OverflowMenu
                                aria-label="Actions sur le rôle"
                                flipped
                                onClick={(e: React.MouseEvent) => e.stopPropagation()}
                              >
                                <OverflowMenuItem
                                  itemText="Ouvrir"
                                  onClick={() => navigate(`/admin/roles/${row.id}`)}
                                />
                                <OverflowMenuItem
                                  itemText="Renommer"
                                  onClick={() => {
                                    if (role) {
                                      setEditRole(role)
                                      setEditLabel(role.label)
                                      setEditAttempted(false)
                                    }
                                  }}
                                />
                                <OverflowMenuItem
                                  hasDivider
                                  isDelete
                                  itemText="Supprimer"
                                  onClick={() => deleteRole.mutate(Number(row.id))}
                                />
                              </OverflowMenu>
                            </TableCell>
                          ) : (
                            <TableCell
                              key={cell.id}
                              onClick={() => navigate(`/admin/roles/${row.id}`)}
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
        modalHeading="Nouveau rôle"
        primaryButtonText="Créer"
        secondaryButtonText="Annuler"
        primaryButtonDisabled={createRole.isPending}
        onRequestClose={() => setCreateOpen(false)}
        onRequestSubmit={submitCreate}
      >
        <TextInput
          id="new-role-label"
          data-testid="role-label-input"
          labelText={requiredLabel('Libellé')}
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          invalid={newLabelInvalid}
          invalidText="Le libellé est obligatoire."
          onKeyDown={(e) => {
            if (e.key === 'Enter') submitCreate()
          }}
        />
        {createRole.isError && (
          <p className="capsule-error">{(createRole.error as Error)?.message}</p>
        )}
      </Modal>

      <Modal
        open={!!editRole}
        modalHeading="Renommer le rôle"
        primaryButtonText="Enregistrer"
        secondaryButtonText="Annuler"
        primaryButtonDisabled={updateRole.isPending}
        onRequestClose={() => setEditRole(null)}
        onRequestSubmit={submitEdit}
      >
        <TextInput
          id="edit-role-label"
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
