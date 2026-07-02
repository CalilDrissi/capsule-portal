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
import type { Role } from '../api/types'

const headers = [
  { key: 'label', header: 'Label' },
  { key: 'actions', header: '' },
]

export default function RolesPage() {
  const navigate = useNavigate()
  const { data, isLoading, isError, error } = useRoles()
  const createRole = useCreateRole()
  const updateRole = useUpdateRole()
  const deleteRole = useDeleteRole()

  const [createOpen, setCreateOpen] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [editRole, setEditRole] = useState<Role | null>(null)
  const [editLabel, setEditLabel] = useState('')

  const roles = data?.results ?? []

  function submitCreate() {
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
        <h2 className="capsule-page__title">Roles</h2>
        <Button renderIcon={Add} onClick={() => setCreateOpen(true)} data-testid="new-role">
          New role
        </Button>
      </div>

      {isLoading ? (
        <DataTableSkeleton columnCount={2} rowCount={5} showHeader={false} />
      ) : isError ? (
        <Tile>Failed to load roles: {(error as Error)?.message}</Tile>
      ) : roles.length === 0 ? (
        <Tile className="capsule-empty">
          <h4>No roles yet</h4>
          <p>Roles bundle permissions and are granted to groups.</p>
          <Button renderIcon={Add} onClick={() => setCreateOpen(true)}>
            New role
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
                                aria-label="Role actions"
                                flipped
                                onClick={(e: React.MouseEvent) => e.stopPropagation()}
                              >
                                <OverflowMenuItem
                                  itemText="Open"
                                  onClick={() => navigate(`/admin/roles/${row.id}`)}
                                />
                                <OverflowMenuItem
                                  itemText="Rename"
                                  onClick={() => {
                                    if (role) {
                                      setEditRole(role)
                                      setEditLabel(role.label)
                                    }
                                  }}
                                />
                                <OverflowMenuItem
                                  hasDivider
                                  isDelete
                                  itemText="Delete"
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
        modalHeading="New role"
        primaryButtonText="Create"
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!newLabel.trim() || createRole.isPending}
        onRequestClose={() => setCreateOpen(false)}
        onRequestSubmit={submitCreate}
      >
        <TextInput
          id="new-role-label"
          data-testid="role-label-input"
          labelText="Label"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
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
        modalHeading="Rename role"
        primaryButtonText="Save"
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!editLabel.trim() || updateRole.isPending}
        onRequestClose={() => setEditRole(null)}
        onRequestSubmit={submitEdit}
      >
        <TextInput
          id="edit-role-label"
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
