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
  useCreateGroup,
  useDeleteGroup,
  useGroups,
  useUpdateGroup,
} from '../api/queries'
import { requiredLabel } from '../lib/forms'
import type { Group } from '../api/types'

const headers = [
  { key: 'name', header: 'Name' },
  { key: 'actions', header: '' },
]

export default function GroupsPage() {
  const navigate = useNavigate()
  const { data, isLoading, isError, error } = useGroups()
  const createGroup = useCreateGroup()
  const updateGroup = useUpdateGroup()
  const deleteGroup = useDeleteGroup()

  const [createOpen, setCreateOpen] = useState(false)
  const [createAttempted, setCreateAttempted] = useState(false)
  const [newName, setNewName] = useState('')
  const [editGroup, setEditGroup] = useState<Group | null>(null)
  const [editAttempted, setEditAttempted] = useState(false)
  const [editName, setEditName] = useState('')

  const groups = data?.results ?? []

  const newNameInvalid = createAttempted && !newName.trim()
  const editNameInvalid = editAttempted && !editName.trim()

  function openCreate() {
    setNewName('')
    setCreateAttempted(false)
    setCreateOpen(true)
  }

  function submitCreate() {
    setCreateAttempted(true)
    const name = newName.trim()
    if (!name) return
    createGroup.mutate(
      { name },
      {
        onSuccess: () => {
          setCreateOpen(false)
          setNewName('')
        },
      },
    )
  }

  function submitEdit() {
    if (!editGroup) return
    setEditAttempted(true)
    const name = editName.trim()
    if (!name) return
    updateGroup.mutate(
      { id: editGroup.id, name },
      { onSuccess: () => setEditGroup(null) },
    )
  }

  const rows = groups.map((g) => ({ id: String(g.id), name: g.name }))

  return (
    <div className="capsule-page">
      <div className="capsule-page__header">
        <h2 className="capsule-page__title">Groups</h2>
        <Button renderIcon={Add} onClick={openCreate} data-testid="new-group">
          New group
        </Button>
      </div>

      {isLoading ? (
        <DataTableSkeleton columnCount={2} rowCount={5} showHeader={false} />
      ) : isError ? (
        <Tile>Failed to load groups: {(error as Error)?.message}</Tile>
      ) : groups.length === 0 ? (
        <Tile className="capsule-empty">
          <h4>No groups yet</h4>
          <p>Create a group to organize users.</p>
          <Button renderIcon={Add} onClick={openCreate}>
            New group
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
                    const grp = groups.find((g) => String(g.id) === row.id)
                    return (
                      <TableRow key={row.id}>
                        {row.cells.map((cell) =>
                          cell.info.header === 'actions' ? (
                            <TableCell key={cell.id}>
                              <OverflowMenu
                                aria-label="Group actions"
                                flipped
                                onClick={(e: React.MouseEvent) => e.stopPropagation()}
                              >
                                <OverflowMenuItem
                                  itemText="Open"
                                  onClick={() => navigate(`/admin/groups/${row.id}`)}
                                />
                                <OverflowMenuItem
                                  itemText="Rename"
                                  onClick={() => {
                                    if (grp) {
                                      setEditGroup(grp)
                                      setEditName(grp.name)
                                      setEditAttempted(false)
                                    }
                                  }}
                                />
                                <OverflowMenuItem
                                  hasDivider
                                  isDelete
                                  itemText="Delete"
                                  onClick={() => deleteGroup.mutate(Number(row.id))}
                                />
                              </OverflowMenu>
                            </TableCell>
                          ) : (
                            <TableCell
                              key={cell.id}
                              onClick={() => navigate(`/admin/groups/${row.id}`)}
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
        modalHeading="New group"
        primaryButtonText="Create"
        secondaryButtonText="Cancel"
        primaryButtonDisabled={createGroup.isPending}
        onRequestClose={() => setCreateOpen(false)}
        onRequestSubmit={submitCreate}
      >
        <TextInput
          id="new-group-name"
          data-testid="group-name-input"
          labelText={requiredLabel('Name')}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          invalid={newNameInvalid}
          invalidText="Name is required."
          onKeyDown={(e) => {
            if (e.key === 'Enter') submitCreate()
          }}
        />
        {createGroup.isError && (
          <p className="capsule-error">{(createGroup.error as Error)?.message}</p>
        )}
      </Modal>

      <Modal
        open={!!editGroup}
        modalHeading="Rename group"
        primaryButtonText="Save"
        secondaryButtonText="Cancel"
        primaryButtonDisabled={updateGroup.isPending}
        onRequestClose={() => setEditGroup(null)}
        onRequestSubmit={submitEdit}
      >
        <TextInput
          id="edit-group-name"
          labelText={requiredLabel('Name')}
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          invalid={editNameInvalid}
          invalidText="Name is required."
          onKeyDown={(e) => {
            if (e.key === 'Enter') submitEdit()
          }}
        />
      </Modal>
    </div>
  )
}
