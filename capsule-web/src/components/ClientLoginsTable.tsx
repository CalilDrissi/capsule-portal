import { useState } from 'react'
import {
  Button,
  CodeSnippet,
  DataTable,
  DataTableSkeleton,
  InlineNotification,
  Modal,
  OverflowMenu,
  OverflowMenuItem,
  PasswordInput,
  RadioButton,
  RadioButtonGroup,
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
  useAddClientUser,
  useClientUsers,
  useDeleteClientUser,
  useResetClientLoginPassword,
  useUpdateClientUser,
} from '../api/queries'
import { MIN_PASSWORD_LENGTH, requiredLabel } from '../lib/forms'
import type { ClientUser } from '../api/types'

const headers = [
  { key: 'username', header: 'Nom d’utilisateur' },
  { key: 'name', header: 'Nom' },
  { key: 'primary', header: 'Principal' },
  { key: 'status', header: 'Statut' },
  { key: 'actions', header: '' },
]

function inviteUrl(path?: string | null): string {
  return path ? `${window.location.origin}${path}` : '—'
}

/**
 * A client's logins (primary owner + employees). Mirrors UsersPage: a Carbon
 * DataTable with a per-row OverflowMenu (reset password, activate/deactivate,
 * remove). The primary login cannot be removed. "Add employee login" mints an
 * invite link shown in a CodeSnippet.
 */
export default function ClientLoginsTable({ clientId }: { clientId: number }) {
  const { data, isLoading, isError } = useClientUsers(clientId)
  const addUser = useAddClientUser(clientId)
  const updateUser = useUpdateClientUser(clientId)
  const deleteUser = useDeleteClientUser(clientId)
  const resetPassword = useResetClientLoginPassword(clientId)

  const users = data ?? []

  // --- Add employee login ---
  const [addOpen, setAddOpen] = useState(false)
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [addAttempted, setAddAttempted] = useState(false)
  const [addInvite, setAddInvite] = useState<string | null>(null)

  const fullNameInvalid = addAttempted && !fullName.trim()

  function openAdd() {
    setFullName('')
    setUsername('')
    setAddAttempted(false)
    setAddInvite(null)
    setAddOpen(true)
  }

  function submitAdd() {
    setAddAttempted(true)
    if (!fullName.trim()) return
    addUser.mutate(
      {
        full_name: fullName.trim(),
        username: username.trim() || undefined,
      },
      { onSuccess: (res) => setAddInvite(inviteUrl(res.invite_path)) },
    )
  }

  // --- Reset password ---
  const [resetUser, setResetUser] = useState<ClientUser | null>(null)
  const [resetMode, setResetMode] = useState<'password' | 'link'>('password')
  const [newPassword, setNewPassword] = useState('')
  const [resetAttempted, setResetAttempted] = useState(false)
  const [resetLink, setResetLink] = useState<string | null>(null)
  const [resetDone, setResetDone] = useState(false)

  const passwordInvalid =
    resetAttempted &&
    resetMode === 'password' &&
    newPassword.trim().length < MIN_PASSWORD_LENGTH

  function openReset(u: ClientUser) {
    setResetUser(u)
    setResetMode('password')
    setNewPassword('')
    setResetAttempted(false)
    setResetLink(null)
    setResetDone(false)
  }

  function closeReset() {
    setResetUser(null)
  }

  function submitReset() {
    if (!resetUser) return
    setResetAttempted(true)
    if (resetMode === 'password') {
      if (newPassword.trim().length < MIN_PASSWORD_LENGTH) return
      resetPassword.mutate(
        { userId: resetUser.user_id, mode: 'password', password: newPassword },
        { onSuccess: () => setResetDone(true) },
      )
    } else {
      resetPassword.mutate(
        { userId: resetUser.user_id, mode: 'link' },
        { onSuccess: (res) => setResetLink(inviteUrl(res.invite_path)) },
      )
    }
  }

  const resetSettled = resetDone || resetLink !== null

  const rows = users.map((u) => ({
    id: String(u.user_id),
    username: u.username,
    name: u.first_name || '—',
    primary: u.is_primary ? 'primary' : '',
    status: u.is_active ? 'active' : 'inactive',
  }))

  return (
    <Stack gap={5}>
      <div className="capsule-page__header">
        <h4>Comptes</h4>
        <Button
          size="sm"
          renderIcon={Add}
          onClick={openAdd}
          data-testid="add-employee-login"
        >
          Ajouter un compte employé
        </Button>
      </div>

      {isLoading ? (
        <DataTableSkeleton columnCount={5} rowCount={3} showHeader={false} />
      ) : isError ? (
        <Tile>Impossible de charger les comptes.</Tile>
      ) : users.length === 0 ? (
        <Tile className="capsule-empty">
          <p>Aucun compte pour le moment.</p>
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
                    const user = users.find(
                      (u) => String(u.user_id) === row.id,
                    )
                    return (
                      <TableRow key={row.id}>
                        {row.cells.map((cell) => {
                          if (cell.info.header === 'primary') {
                            return (
                              <TableCell key={cell.id}>
                                {cell.value === 'primary' ? (
                                  <Tag type="purple">Principal</Tag>
                                ) : (
                                  ''
                                )}
                              </TableCell>
                            )
                          }
                          if (cell.info.header === 'status') {
                            return (
                              <TableCell key={cell.id}>
                                <Tag
                                  type={
                                    cell.value === 'active' ? 'green' : 'gray'
                                  }
                                >
                                  {cell.value === 'active'
                                    ? 'Actif'
                                    : 'Inactif'}
                                </Tag>
                              </TableCell>
                            )
                          }
                          if (cell.info.header === 'actions') {
                            if (!user) {
                              return <TableCell key={cell.id} />
                            }
                            return (
                              <TableCell key={cell.id}>
                                <OverflowMenu
                                  aria-label="Actions du compte"
                                  flipped
                                >
                                  <OverflowMenuItem
                                    itemText="Réinitialiser le mot de passe"
                                    onClick={() => openReset(user)}
                                  />
                                  <OverflowMenuItem
                                    itemText={
                                      user.is_active
                                        ? 'Désactiver'
                                        : 'Activer'
                                    }
                                    onClick={() =>
                                      updateUser.mutate({
                                        userId: user.user_id,
                                        active: !user.is_active,
                                      })
                                    }
                                  />
                                  {!user.is_primary && (
                                    <OverflowMenuItem
                                      hasDivider
                                      isDelete
                                      itemText="Retirer"
                                      onClick={() =>
                                        deleteUser.mutate(user.user_id)
                                      }
                                    />
                                  )}
                                </OverflowMenu>
                              </TableCell>
                            )
                          }
                          return (
                            <TableCell key={cell.id}>{cell.value}</TableCell>
                          )
                        })}
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DataTable>
      )}

      {/* Add employee login */}
      <Modal
        open={addOpen}
        modalHeading={addInvite ? 'Compte employé ajouté' : 'Ajouter un compte employé'}
        primaryButtonText={addInvite ? 'Terminé' : 'Ajouter le compte'}
        secondaryButtonText={addInvite ? undefined : 'Annuler'}
        primaryButtonDisabled={!addInvite && addUser.isPending}
        onRequestClose={() => setAddOpen(false)}
        onRequestSubmit={addInvite ? () => setAddOpen(false) : submitAdd}
        onSecondarySubmit={() => setAddOpen(false)}
        data-testid="add-employee-modal"
      >
        {addInvite ? (
          <Stack gap={5}>
            <InlineNotification
              kind="success"
              title="Compte employé ajouté"
              subtitle="Envoyez ce lien à l’employé. Il l’ouvre, définit son propre mot de passe et accède directement à l’espace de travail. Le lien ne peut être utilisé qu’une seule fois."
              lowContrast
              hideCloseButton
            />
            <div>
              <p className="cds--label">Lien d’invitation</p>
              <CodeSnippet type="multi" data-testid="employee-invite-link">
                {addInvite}
              </CodeSnippet>
            </div>
          </Stack>
        ) : (
          <Stack gap={5}>
            <TextInput
              id="employee-full-name"
              labelText={requiredLabel('Nom complet')}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              invalid={fullNameInvalid}
              invalidText="Le nom complet est obligatoire."
            />
            <TextInput
              id="employee-username"
              labelText="Nom d’utilisateur (facultatif)"
              helperText="Laissez vide pour générer automatiquement."
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </Stack>
        )}
      </Modal>

      {/* Reset password */}
      <Modal
        open={!!resetUser}
        modalHeading={
          resetSettled
            ? 'Mot de passe réinitialisé'
            : `Réinitialiser le mot de passe — ${resetUser?.username ?? ''}`
        }
        primaryButtonText={
          resetSettled
            ? 'Terminé'
            : resetMode === 'password'
              ? 'Définir le mot de passe'
              : 'Générer le lien'
        }
        secondaryButtonText={resetSettled ? undefined : 'Annuler'}
        primaryButtonDisabled={!resetSettled && resetPassword.isPending}
        onRequestClose={closeReset}
        onRequestSubmit={resetSettled ? closeReset : submitReset}
        onSecondarySubmit={closeReset}
        data-testid="reset-password-modal"
      >
        {resetLink !== null ? (
          <Stack gap={5}>
            <InlineNotification
              kind="success"
              title="Lien de configuration prêt"
              subtitle="Envoyez ce lien à l’utilisateur. Il ne peut être utilisé qu’une seule fois."
              lowContrast
              hideCloseButton
            />
            <div>
              <p className="cds--label">Lien de configuration</p>
              <CodeSnippet type="multi" data-testid="reset-link">
                {resetLink}
              </CodeSnippet>
            </div>
          </Stack>
        ) : resetDone ? (
          <InlineNotification
            kind="success"
            title="Mot de passe mis à jour"
            subtitle="Le nouveau mot de passe est désormais actif."
            lowContrast
            hideCloseButton
          />
        ) : (
          <Stack gap={5}>
            <RadioButtonGroup
              legendText="Comment souhaitez-vous le réinitialiser ?"
              name="reset-mode"
              orientation="vertical"
              valueSelected={resetMode}
              onChange={(value) =>
                setResetMode(value as 'password' | 'link')
              }
            >
              <RadioButton
                labelText="Définir un nouveau mot de passe maintenant"
                value="password"
                id="reset-mode-password"
              />
              <RadioButton
                labelText="Envoyer un lien de configuration (l’utilisateur choisit le sien)"
                value="link"
                id="reset-mode-link"
              />
            </RadioButtonGroup>
            {resetMode === 'password' && (
              <PasswordInput
                id="reset-new-password"
                labelText={requiredLabel('Nouveau mot de passe')}
                helperText={`Au moins ${MIN_PASSWORD_LENGTH} caractères.`}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                invalid={passwordInvalid}
                invalidText={`Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`}
              />
            )}
          </Stack>
        )}
      </Modal>
    </Stack>
  )
}
