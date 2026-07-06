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
  { key: 'username', header: "Nom d'utilisateur" },
  { key: 'name', header: 'Nom' },
  { key: 'status', header: 'Statut' },
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
          : "Impossible d'ajouter le comptable. Veuillez réessayer.",
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
  if (isLoading) return <InlineLoading description="Chargement du cabinet…" />
  if (isError || !firm)
    return (
      <div className="capsule-page">
        <PageBreadcrumb
          items={[{ label: 'Cabinets', to: '/firms' }, { label: 'Introuvable' }]}
        />
        <Tile>Cabinet introuvable.</Tile>
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
        items={[{ label: 'Cabinets', to: '/firms' }, { label: firm.name }]}
      />
      <div className="capsule-page__header">
        <h2 className="capsule-page__title">{firm.name}</h2>
        <Tag type={isActive ? 'green' : 'gray'}>
          {isActive ? 'Actif' : 'Inactif'}
        </Tag>
      </div>

      {/* --------------------------- Firm details -------------------------- */}
      <div className="capsule-tabs">
        <h3 className="capsule-section-title">Détails du cabinet</h3>
        <Stack gap={5}>
          {updateFirm.isError && (
            <InlineNotification
              kind="error"
              title="Impossible d'enregistrer le cabinet"
              subtitle={(updateFirm.error as Error)?.message}
              lowContrast
              hideCloseButton
            />
          )}
          <LogoUpload name={name} value={logo} onChange={setLogo} />
          <TextInput
            id="firm-detail-name"
            labelText={requiredLabel('Nom du cabinet')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            invalid={nameInvalid}
            invalidText="Le nom du cabinet est obligatoire."
          />
          <TextInput
            id="firm-detail-email"
            labelText="E-mail de contact"
            placeholder="ex. bonjour@cabinet.example"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
          />
          <div>
            <Button onClick={saveDetails} disabled={updateFirm.isPending}>
              Enregistrer
            </Button>
          </div>
        </Stack>
      </div>

      {/* ---------------------------- Accountants -------------------------- */}
      <div className="capsule-tabs">
        <div className="capsule-page__header">
          <h3 className="capsule-section-title">Comptables</h3>
          <Button
            renderIcon={Add}
            onClick={openAdd}
            data-testid="add-accountant"
          >
            Ajouter un comptable
          </Button>
        </div>

        {acctLoading ? (
          <DataTableSkeleton columnCount={4} rowCount={3} showHeader={false} />
        ) : acctError ? (
          <Tile>Impossible de charger les comptables.</Tile>
        ) : rows.length === 0 ? (
          <Tile className="capsule-empty">
            <h4>Aucun comptable pour le moment</h4>
            <p>Ajoutez le premier compte comptable du cabinet pour commencer.</p>
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
                                  aria-label="Actions du comptable"
                                  flipped
                                >
                                  <OverflowMenuItem
                                    itemText="Réinitialiser le mot de passe"
                                    onClick={() => acct && openReset(acct)}
                                  />
                                  <OverflowMenuItem
                                    itemText={
                                      acct?.is_active ? 'Désactiver' : 'Activer'
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
                                    itemText="Retirer"
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
                                    ? 'Actif'
                                    : 'Inactif'}
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
        <h3 className="capsule-section-title">Zone de danger</h3>
        <Stack gap={5}>
          <InlineNotification
            kind="warning"
            title={isActive ? 'Désactiver ce cabinet' : 'Réactiver ce cabinet'}
            subtitle={
              isActive
                ? 'La désactivation désactive TOUS les comptes du cabinet, y compris ses comptables et ses clients. Vous pourrez le réactiver plus tard.'
                : 'La réactivation restaure le cabinet. Chaque compte conserve son propre état d’activité.'
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
              {isActive ? 'Désactiver le cabinet' : 'Activer le cabinet'}
            </Button>
          </div>

          <InlineNotification
            kind="error"
            title="Supprimer ce cabinet"
            subtitle="Supprime définitivement le cabinet et son provisionnement. Cette action est irréversible."
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
              Supprimer le cabinet
            </Button>
          </div>
        </Stack>
      </div>

      {/* -------------------------- Add accountant ------------------------- */}
      <Modal
        open={addOpen}
        modalHeading={created ? 'Comptable ajouté' : 'Ajouter un comptable'}
        primaryButtonText={created ? 'Terminé' : 'Ajouter un comptable'}
        secondaryButtonText={created ? undefined : 'Annuler'}
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
              title="Le compte comptable est prêt"
              subtitle="Partagez les identifiants ci-dessous. Demandez-lui de modifier le mot de passe après la première connexion."
              lowContrast
              hideCloseButton
            />
            <div>
              <p className="cds--label">URL de connexion</p>
              <CodeSnippet type="single">{window.location.origin}</CodeSnippet>
              <p className="cds--label" style={{ marginTop: '0.5rem' }}>
                Nom d'utilisateur
              </p>
              <CodeSnippet type="single" data-testid="new-acct-username">
                {created.username}
              </CodeSnippet>
              <p className="cds--label" style={{ marginTop: '0.5rem' }}>
                Mot de passe
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
                title="Impossible d'ajouter le comptable"
                subtitle={addError}
                lowContrast
                hideCloseButton
              />
            )}
            <TextInput
              id="add-acct-name"
              labelText={requiredLabel('Nom complet')}
              placeholder="ex. Sam Rivera"
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              invalid={addNameInvalid}
              invalidText="Le nom complet est obligatoire."
            />
            <TextInput
              id="add-acct-user"
              labelText="Nom d'utilisateur (facultatif)"
              helperText="Utilisé pour se connecter. Laissez vide pour le générer automatiquement."
              value={addUser}
              onChange={(e) => setAddUser(e.target.value)}
            />
            <PasswordInput
              id="add-acct-pass"
              labelText={requiredLabel('Mot de passe')}
              helperText={`Généré automatiquement — vous pouvez le modifier. Au moins ${MIN_PASSWORD_LENGTH} caractères.`}
              value={addPass}
              onChange={(e) => setAddPass(e.target.value)}
              invalid={addPassInvalid}
              invalidText={`Le mot de passe doit comporter au moins ${MIN_PASSWORD_LENGTH} caractères.`}
            />
          </Stack>
        )}
      </Modal>

      {/* ------------------------- Reset password -------------------------- */}
      <Modal
        open={!!resetTarget}
        modalHeading={
          resetDone
            ? 'Mot de passe réinitialisé'
            : `Réinitialiser le mot de passe — ${resetTarget?.username ?? ''}`
        }
        primaryButtonText={resetDone ? 'Terminé' : 'Réinitialiser le mot de passe'}
        secondaryButtonText={resetDone ? undefined : 'Annuler'}
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
              title="Mot de passe mis à jour"
              subtitle="Partagez le nouveau mot de passe ci-dessous."
              lowContrast
              hideCloseButton
            />
            <div>
              <p className="cds--label">Nouveau mot de passe</p>
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
                title="Impossible de réinitialiser le mot de passe"
                subtitle={(resetPassword.error as Error)?.message}
                lowContrast
                hideCloseButton
              />
            )}
            <PasswordInput
              id="reset-acct-pass"
              labelText={requiredLabel('Nouveau mot de passe')}
              helperText={`Généré automatiquement — vous pouvez le modifier. Au moins ${MIN_PASSWORD_LENGTH} caractères.`}
              value={resetPass}
              onChange={(e) => setResetPass(e.target.value)}
              invalid={resetPassInvalid}
              invalidText={`Le mot de passe doit comporter au moins ${MIN_PASSWORD_LENGTH} caractères.`}
            />
          </Stack>
        )}
      </Modal>

      {/* --------------------------- Delete firm --------------------------- */}
      <Modal
        open={confirmDelete}
        danger
        modalHeading={`Supprimer ${firm.name} ?`}
        primaryButtonText="Supprimer le cabinet"
        secondaryButtonText="Annuler"
        primaryButtonDisabled={deleteFirm.isPending}
        onRequestClose={() => setConfirmDelete(false)}
        onRequestSubmit={handleDelete}
        onSecondarySubmit={() => setConfirmDelete(false)}
        data-testid="delete-firm-modal"
      >
        <p>
          Cette action supprime définitivement le cabinet et son provisionnement.
          Elle est irréversible.
        </p>
      </Modal>
    </div>
  )
}
