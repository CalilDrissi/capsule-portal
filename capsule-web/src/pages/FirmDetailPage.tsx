import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Button,
  CodeSnippet,
  DataTable,
  DataTableSkeleton,
  InlineLoading,
  InlineNotification,
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
import PageBreadcrumb from '../components/PageBreadcrumb'
import LogoUpload from '../components/LogoUpload'
import {
  useCreateAccountant,
  useDeleteAccountant,
  useDeleteFirm,
  useFirm,
  useFirmAccountants,
  useResetAccountantPassword,
  useSetFirmActive,
  useUpdateAccountant,
  useUpdateFirm,
} from '../api/queries'
import { MIN_PASSWORD_LENGTH, requiredLabel } from '../lib/forms'
import type { AccountantSummary } from '../api/types'

/** A readable, policy-passing password (>=10 chars, mixed case + digits). */
function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  let s = ''
  for (let i = 0; i < 10; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return `Acc-${s}`
}

const acctHeaders = [
  { key: 'username', header: 'Username' },
  { key: 'name', header: 'Name' },
  { key: 'status', header: 'Status' },
  { key: 'actions', header: '' },
]

interface CreatedLogin {
  username: string
  password: string
}

export default function FirmDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const firmId = id ? Number(id) : null

  const { data: firm, isLoading, isError } = useFirm(firmId)
  const updateFirm = useUpdateFirm(firmId ?? 0)
  const setFirmActive = useSetFirmActive(firmId ?? 0)
  const deleteFirm = useDeleteFirm()
  const {
    data: accountants,
    isLoading: acctLoading,
    isError: acctError,
  } = useFirmAccountants(firmId)
  const createAccountant = useCreateAccountant()
  const updateAccountant = useUpdateAccountant(firmId ?? 0)
  const deleteAccountant = useDeleteAccountant(firmId ?? 0)
  const resetPassword = useResetAccountantPassword(firmId ?? 0)

  /* ----------------------------- Firm details ---------------------------- */
  const [name, setName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [logo, setLogo] = useState('')
  const [detailsAttempted, setDetailsAttempted] = useState(false)

  // Seed the edit form once the firm loads (and whenever it changes).
  useEffect(() => {
    if (firm) {
      setName(firm.name)
      setContactEmail(firm.contact_email ?? '')
      setLogo(firm.logo ?? '')
    }
  }, [firm])

  const nameInvalid = detailsAttempted && !name.trim()

  function saveDetails() {
    setDetailsAttempted(true)
    if (!name.trim()) return
    updateFirm.mutate({
      name: name.trim(),
      contact_email: contactEmail.trim(),
      logo,
    })
  }

  /* ------------------------- Add accountant modal ------------------------ */
  const [addOpen, setAddOpen] = useState(false)
  const [addName, setAddName] = useState('')
  const [addUser, setAddUser] = useState('')
  const [addPass, setAddPass] = useState('')
  const [addAttempted, setAddAttempted] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [created, setCreated] = useState<CreatedLogin | null>(null)

  const addNameInvalid = addAttempted && !addName.trim()
  const addPassInvalid = addAttempted && addPass.trim().length < MIN_PASSWORD_LENGTH

  function openAdd() {
    setAddName('')
    setAddUser('')
    setAddPass(generatePassword())
    setAddAttempted(false)
    setAddError(null)
    setCreated(null)
    setAddOpen(true)
  }

  async function submitAdd() {
    if (firmId == null) return
    setAddError(null)
    setAddAttempted(true)
    const full = addName.trim()
    const username = addUser.trim()
    if (!full || addPass.trim().length < MIN_PASSWORD_LENGTH) return
    try {
      const res = await createAccountant.mutateAsync({
        firmId,
        username,
        password: addPass,
        full_name: full,
      })
      setCreated({ username: res.user.username, password: addPass })
    } catch (e) {
      setAddError(
        e instanceof Error
          ? e.message.replace(/^[A-Z]+ \/[^:]+: \d+: /, '')
          : 'Could not add the accountant. Please try again.',
      )
    }
  }

  /* -------------------------- Reset password modal ----------------------- */
  const [resetTarget, setResetTarget] = useState<AccountantSummary | null>(null)
  const [resetPass, setResetPass] = useState('')
  const [resetAttempted, setResetAttempted] = useState(false)
  const [resetDone, setResetDone] = useState(false)

  const resetPassInvalid =
    resetAttempted && resetPass.trim().length < MIN_PASSWORD_LENGTH

  function openReset(a: AccountantSummary) {
    setResetTarget(a)
    setResetPass(generatePassword())
    setResetAttempted(false)
    setResetDone(false)
  }

  function submitReset() {
    if (!resetTarget) return
    setResetAttempted(true)
    if (resetPass.trim().length < MIN_PASSWORD_LENGTH) return
    resetPassword.mutate(
      { userId: resetTarget.user_id, password: resetPass },
      { onSuccess: () => setResetDone(true) },
    )
  }

  /* ------------------------------ Danger zone ---------------------------- */
  const [confirmDelete, setConfirmDelete] = useState(false)

  function toggleActive() {
    if (!firm) return
    setFirmActive.mutate(firm.is_active === false)
  }

  function handleDelete() {
    if (firmId == null) return
    deleteFirm.mutate(firmId, { onSuccess: () => navigate('/firms') })
  }

  /* -------------------------------- Render ------------------------------- */
  if (isLoading) return <InlineLoading description="Loading firm…" />
  if (isError || !firm)
    return (
      <div className="capsule-page">
        <PageBreadcrumb
          items={[{ label: 'Firms', to: '/firms' }, { label: 'Not found' }]}
        />
        <Tile>Firm not found.</Tile>
      </div>
    )

  const isActive = firm.is_active !== false
  const rows = (accountants ?? []).map((a) => ({
    id: String(a.user_id),
    username: a.username,
    name: a.first_name || '—',
    status: a.is_active ? 'active' : 'inactive',
  }))

  return (
    <div className="capsule-page">
      <PageBreadcrumb
        items={[{ label: 'Firms', to: '/firms' }, { label: firm.name }]}
      />
      <div className="capsule-page__header">
        <h2 className="capsule-page__title">{firm.name}</h2>
        <Tag type={isActive ? 'green' : 'gray'}>
          {isActive ? 'Active' : 'Inactive'}
        </Tag>
      </div>

      {/* --------------------------- Firm details -------------------------- */}
      <div className="capsule-tabs">
        <h3 className="capsule-section-title">Firm details</h3>
        <Stack gap={5}>
          {updateFirm.isError && (
            <InlineNotification
              kind="error"
              title="Could not save firm"
              subtitle={(updateFirm.error as Error)?.message}
              lowContrast
              hideCloseButton
            />
          )}
          <LogoUpload name={name} value={logo} onChange={setLogo} />
          <TextInput
            id="firm-detail-name"
            labelText={requiredLabel('Firm name')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            invalid={nameInvalid}
            invalidText="Firm name is required."
          />
          <TextInput
            id="firm-detail-email"
            labelText="Contact email"
            placeholder="e.g. hello@firm.example"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
          />
          <div>
            <Button onClick={saveDetails} disabled={updateFirm.isPending}>
              Save
            </Button>
          </div>
        </Stack>
      </div>

      {/* ---------------------------- Accountants -------------------------- */}
      <div className="capsule-tabs">
        <div className="capsule-page__header">
          <h3 className="capsule-section-title">Accountants</h3>
          <Button
            renderIcon={Add}
            onClick={openAdd}
            data-testid="add-accountant"
          >
            Add accountant
          </Button>
        </div>

        {acctLoading ? (
          <DataTableSkeleton columnCount={4} rowCount={3} showHeader={false} />
        ) : acctError ? (
          <Tile>Failed to load accountants.</Tile>
        ) : rows.length === 0 ? (
          <Tile className="capsule-empty">
            <h4>No accountants yet</h4>
            <p>Add the firm's first accountant login to get started.</p>
          </Tile>
        ) : (
          <DataTable rows={rows} headers={acctHeaders} isSortable>
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
                      const acct = (accountants ?? []).find(
                        (a) => String(a.user_id) === row.id,
                      )
                      return (
                        <TableRow key={row.id}>
                          {row.cells.map((cell) =>
                            cell.info.header === 'actions' ? (
                              <TableCell key={cell.id}>
                                <OverflowMenu
                                  aria-label="Accountant actions"
                                  flipped
                                >
                                  <OverflowMenuItem
                                    itemText="Reset password"
                                    onClick={() => acct && openReset(acct)}
                                  />
                                  <OverflowMenuItem
                                    itemText={
                                      acct?.is_active ? 'Deactivate' : 'Activate'
                                    }
                                    onClick={() =>
                                      acct &&
                                      updateAccountant.mutate({
                                        userId: acct.user_id,
                                        active: !acct.is_active,
                                      })
                                    }
                                  />
                                  <OverflowMenuItem
                                    hasDivider
                                    isDelete
                                    itemText="Remove"
                                    onClick={() =>
                                      acct &&
                                      deleteAccountant.mutate(acct.user_id)
                                    }
                                  />
                                </OverflowMenu>
                              </TableCell>
                            ) : cell.info.header === 'status' ? (
                              <TableCell key={cell.id}>
                                <Tag
                                  type={
                                    cell.value === 'active' ? 'green' : 'gray'
                                  }
                                >
                                  {cell.value === 'active'
                                    ? 'Active'
                                    : 'Inactive'}
                                </Tag>
                              </TableCell>
                            ) : (
                              <TableCell key={cell.id}>{cell.value}</TableCell>
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
      </div>

      {/* ---------------------------- Danger zone -------------------------- */}
      <div className="capsule-tabs">
        <h3 className="capsule-section-title">Danger zone</h3>
        <Stack gap={5}>
          <InlineNotification
            kind="warning"
            title={isActive ? 'Deactivate this firm' : 'Reactivate this firm'}
            subtitle={
              isActive
                ? 'Deactivating disables ALL of the firm’s logins, including its accountants and clients. You can reactivate later.'
                : 'Reactivating restores the firm. Individual logins keep their own active state.'
            }
            lowContrast
            hideCloseButton
          />
          <div>
            <Button
              kind="tertiary"
              onClick={toggleActive}
              disabled={setFirmActive.isPending}
              data-testid="toggle-firm-active"
            >
              {isActive ? 'Deactivate firm' : 'Activate firm'}
            </Button>
          </div>

          <InlineNotification
            kind="error"
            title="Delete this firm"
            subtitle="Permanently removes the firm and its provisioning. This cannot be undone."
            lowContrast
            hideCloseButton
          />
          <div>
            <Button
              kind="danger"
              onClick={() => setConfirmDelete(true)}
              disabled={deleteFirm.isPending}
              data-testid="delete-firm"
            >
              Delete firm
            </Button>
          </div>
        </Stack>
      </div>

      {/* -------------------------- Add accountant ------------------------- */}
      <Modal
        open={addOpen}
        modalHeading={created ? 'Accountant added' : 'Add accountant'}
        primaryButtonText={created ? 'Done' : 'Add accountant'}
        secondaryButtonText={created ? undefined : 'Cancel'}
        primaryButtonDisabled={!created && createAccountant.isPending}
        onRequestClose={() => setAddOpen(false)}
        onRequestSubmit={created ? () => setAddOpen(false) : submitAdd}
        onSecondarySubmit={() => setAddOpen(false)}
        data-testid="add-accountant-modal"
      >
        {created ? (
          <Stack gap={5}>
            <InlineNotification
              kind="success"
              title="Accountant login is ready"
              subtitle="Share the login below. Ask them to change the password after first sign-in."
              lowContrast
              hideCloseButton
            />
            <div>
              <p className="cds--label">Sign-in URL</p>
              <CodeSnippet type="single">{window.location.origin}</CodeSnippet>
              <p className="cds--label" style={{ marginTop: '0.5rem' }}>
                Username
              </p>
              <CodeSnippet type="single" data-testid="new-acct-username">
                {created.username}
              </CodeSnippet>
              <p className="cds--label" style={{ marginTop: '0.5rem' }}>
                Password
              </p>
              <CodeSnippet type="single" data-testid="new-acct-password">
                {created.password}
              </CodeSnippet>
            </div>
          </Stack>
        ) : (
          <Stack gap={5}>
            {addError && (
              <InlineNotification
                kind="error"
                title="Could not add accountant"
                subtitle={addError}
                lowContrast
                hideCloseButton
              />
            )}
            <TextInput
              id="add-acct-name"
              labelText={requiredLabel('Full name')}
              placeholder="e.g. Sam Rivera"
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              invalid={addNameInvalid}
              invalidText="Full name is required."
            />
            <TextInput
              id="add-acct-user"
              labelText="Username (optional)"
              helperText="Used to sign in. Leave blank to auto-generate."
              value={addUser}
              onChange={(e) => setAddUser(e.target.value)}
            />
            <PasswordInput
              id="add-acct-pass"
              labelText={requiredLabel('Password')}
              helperText={`Auto-generated — you can edit it. At least ${MIN_PASSWORD_LENGTH} characters.`}
              value={addPass}
              onChange={(e) => setAddPass(e.target.value)}
              invalid={addPassInvalid}
              invalidText={`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`}
            />
          </Stack>
        )}
      </Modal>

      {/* ------------------------- Reset password -------------------------- */}
      <Modal
        open={!!resetTarget}
        modalHeading={
          resetDone
            ? 'Password reset'
            : `Reset password — ${resetTarget?.username ?? ''}`
        }
        primaryButtonText={resetDone ? 'Done' : 'Reset password'}
        secondaryButtonText={resetDone ? undefined : 'Cancel'}
        primaryButtonDisabled={!resetDone && resetPassword.isPending}
        onRequestClose={() => setResetTarget(null)}
        onRequestSubmit={resetDone ? () => setResetTarget(null) : submitReset}
        onSecondarySubmit={() => setResetTarget(null)}
        data-testid="reset-password-modal"
      >
        {resetDone ? (
          <Stack gap={5}>
            <InlineNotification
              kind="success"
              title="Password updated"
              subtitle="Share the new password below."
              lowContrast
              hideCloseButton
            />
            <div>
              <p className="cds--label">New password</p>
              <CodeSnippet type="single" data-testid="reset-acct-password">
                {resetPass}
              </CodeSnippet>
            </div>
          </Stack>
        ) : (
          <Stack gap={5}>
            {resetPassword.isError && (
              <InlineNotification
                kind="error"
                title="Could not reset password"
                subtitle={(resetPassword.error as Error)?.message}
                lowContrast
                hideCloseButton
              />
            )}
            <PasswordInput
              id="reset-acct-pass"
              labelText={requiredLabel('New password')}
              helperText={`Auto-generated — you can edit it. At least ${MIN_PASSWORD_LENGTH} characters.`}
              value={resetPass}
              onChange={(e) => setResetPass(e.target.value)}
              invalid={resetPassInvalid}
              invalidText={`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`}
            />
          </Stack>
        )}
      </Modal>

      {/* --------------------------- Delete firm --------------------------- */}
      <Modal
        open={confirmDelete}
        danger
        modalHeading={`Delete ${firm.name}?`}
        primaryButtonText="Delete firm"
        secondaryButtonText="Cancel"
        primaryButtonDisabled={deleteFirm.isPending}
        onRequestClose={() => setConfirmDelete(false)}
        onRequestSubmit={handleDelete}
        onSecondarySubmit={() => setConfirmDelete(false)}
        data-testid="delete-firm-modal"
      >
        <p>
          This permanently deletes the firm and its provisioning. This action
          cannot be undone.
        </p>
      </Modal>
    </div>
  )
}
