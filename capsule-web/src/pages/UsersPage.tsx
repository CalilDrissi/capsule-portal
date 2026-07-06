import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  DataTable,
  DataTableSkeleton,
  Modal,
  OverflowMenu,
  OverflowMenuItem,
  PasswordInput,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
  TextInput,
  Tile,
} from '@carbon/react'
import { Add } from '@carbon/icons-react'
import {
  useCreateUser,
  useDeleteUser,
  useUpdateUser,
  useUsers,
} from '../api/queries'
import { requiredLabel } from '../lib/forms'
import type { User } from '../api/types'

const headers = [
  { key: 'username', header: 'Username' },
  { key: 'name', header: 'Name' },
  { key: 'email', header: 'Email' },
  { key: 'active', header: 'Active' },
  { key: 'actions', header: '' },
]

export default function UsersPage() {
  const navigate = useNavigate()
  const { data, isLoading, isError, error } = useUsers()
  const createUser = useCreateUser()
  const updateUser = useUpdateUser()
  const deleteUser = useDeleteUser()

  const [createOpen, setCreateOpen] = useState(false)
  const [attempted, setAttempted] = useState(false)
  const [form, setForm] = useState({
    username: '',
    first_name: '',
    last_name: '',
    email: '',
    password: '',
  })
  const [editUser, setEditUser] = useState<User | null>(null)
  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
  })

  const users = data?.results ?? []

  const usernameInvalid = attempted && !form.username.trim()
  const passwordInvalid = attempted && !form.password.trim()

  function resetForm() {
    setForm({ username: '', first_name: '', last_name: '', email: '', password: '' })
  }

  function openCreate() {
    resetForm()
    setAttempted(false)
    setCreateOpen(true)
  }

  function submitCreate() {
    setAttempted(true)
    if (!form.username.trim() || !form.password.trim()) return
    createUser.mutate(
      {
        username: form.username.trim(),
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim(),
        password: form.password || undefined,
      },
      {
        onSuccess: () => {
          setCreateOpen(false)
          resetForm()
        },
      },
    )
  }

  function openEdit(u: User) {
    setEditUser(u)
    setEditForm({
      first_name: u.first_name ?? '',
      last_name: u.last_name ?? '',
      email: u.email ?? '',
    })
  }

  function submitEdit() {
    if (!editUser) return
    updateUser.mutate(
      { id: editUser.id, ...editForm },
      { onSuccess: () => setEditUser(null) },
    )
  }

  const rows = users.map((u) => ({
    id: String(u.id),
    username: u.username,
    name: [u.first_name, u.last_name].filter(Boolean).join(' ') || '—',
    email: u.email || '—',
    active: u.is_active ? 'active' : 'inactive',
  }))

  return (
    <div className="capsule-page">
      <div className="capsule-page__header">
        <h2 className="capsule-page__title">Users</h2>
        <Button
          renderIcon={Add}
          onClick={openCreate}
          data-testid="new-user"
        >
          New user
        </Button>
      </div>

      {isLoading ? (
        <DataTableSkeleton columnCount={5} rowCount={5} showHeader={false} />
      ) : isError ? (
        <Tile>Failed to load users: {(error as Error)?.message}</Tile>
      ) : users.length === 0 ? (
        <Tile className="capsule-empty">
          <h4>No users yet</h4>
          <p>Superusers are managed separately and not listed here.</p>
          <Button renderIcon={Add} onClick={openCreate}>
            New user
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
                    const user = users.find((u) => String(u.id) === row.id)
                    return (
                      <TableRow key={row.id}>
                        {row.cells.map((cell) =>
                          cell.info.header === 'actions' ? (
                            <TableCell key={cell.id}>
                              <OverflowMenu
                                aria-label="User actions"
                                flipped
                                onClick={(e: React.MouseEvent) =>
                                  e.stopPropagation()
                                }
                              >
                                <OverflowMenuItem
                                  itemText="Open"
                                  onClick={() => navigate(`/admin/users/${row.id}`)}
                                />
                                <OverflowMenuItem
                                  itemText="Edit"
                                  onClick={() => user && openEdit(user)}
                                />
                                <OverflowMenuItem
                                  hasDivider
                                  isDelete
                                  itemText="Delete"
                                  onClick={() => deleteUser.mutate(Number(row.id))}
                                />
                              </OverflowMenu>
                            </TableCell>
                          ) : cell.info.header === 'active' ? (
                            <TableCell key={cell.id}>
                              <Tag type={cell.value === 'active' ? 'green' : 'gray'}>
                                {cell.value}
                              </Tag>
                            </TableCell>
                          ) : (
                            <TableCell
                              key={cell.id}
                              onClick={() => navigate(`/admin/users/${row.id}`)}
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
        modalHeading="New user"
        primaryButtonText="Create"
        secondaryButtonText="Cancel"
        primaryButtonDisabled={createUser.isPending}
        onRequestClose={() => setCreateOpen(false)}
        onRequestSubmit={submitCreate}
      >
        <Stack gap={5}>
          <TextInput
            id="new-user-username"
            data-testid="user-username-input"
            labelText={requiredLabel('Username')}
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            invalid={usernameInvalid}
            invalidText="Username is required."
          />
          <TextInput
            id="new-user-first"
            labelText="First name"
            value={form.first_name}
            onChange={(e) => setForm({ ...form, first_name: e.target.value })}
          />
          <TextInput
            id="new-user-last"
            labelText="Last name"
            value={form.last_name}
            onChange={(e) => setForm({ ...form, last_name: e.target.value })}
          />
          <TextInput
            id="new-user-email"
            labelText="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <PasswordInput
            id="new-user-password"
            data-testid="user-password-input"
            labelText={requiredLabel('Password')}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            invalid={passwordInvalid}
            invalidText="Password is required."
          />
        </Stack>
        {createUser.isError && (
          <p className="capsule-error">
            {(createUser.error as Error)?.message}
          </p>
        )}
      </Modal>

      <Modal
        open={!!editUser}
        modalHeading={`Edit ${editUser?.username ?? ''}`}
        primaryButtonText="Save"
        secondaryButtonText="Cancel"
        primaryButtonDisabled={updateUser.isPending}
        onRequestClose={() => setEditUser(null)}
        onRequestSubmit={submitEdit}
      >
        <Stack gap={5}>
          <TextInput
            id="edit-user-first"
            data-testid="user-edit-first"
            labelText="First name"
            value={editForm.first_name}
            onChange={(e) =>
              setEditForm({ ...editForm, first_name: e.target.value })
            }
          />
          <TextInput
            id="edit-user-last"
            labelText="Last name"
            value={editForm.last_name}
            onChange={(e) =>
              setEditForm({ ...editForm, last_name: e.target.value })
            }
          />
          <TextInput
            id="edit-user-email"
            labelText="Email"
            value={editForm.email}
            onChange={(e) =>
              setEditForm({ ...editForm, email: e.target.value })
            }
          />
        </Stack>
      </Modal>
    </div>
  )
}
