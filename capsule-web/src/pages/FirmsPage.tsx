import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  ClickableTile,
  CodeSnippet,
  InlineNotification,
  Modal,
  SkeletonText,
  Stack,
  Tag,
  TextInput,
  Tile,
} from '@carbon/react'
import { Add, Enterprise } from '@carbon/icons-react'
import { useCreateAccountant, useCreateFirm, useFirms } from '../api/queries'
import { requiredLabel } from '../lib/forms'
import type { Firm } from '../api/types'

/** A readable, policy-passing password (>=10 chars, mixed case + digits). */
function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  let s = ''
  for (let i = 0; i < 10; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return `Acc-${s}`
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 20)
}


interface Created {
  firm: Firm
  username: string
  password: string
}

export default function FirmsPage() {
  const navigate = useNavigate()
  const { data: firms, isLoading, isError } = useFirms()
  const createFirm = useCreateFirm()
  const createAccountant = useCreateAccountant()

  const [open, setOpen] = useState(false)
  const [firmName, setFirmName] = useState('')
  const [acctName, setAcctName] = useState('')
  const [acctUser, setAcctUser] = useState('')
  const [acctPass, setAcctPass] = useState('')
  const [created, setCreated] = useState<Created | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [attempted, setAttempted] = useState(false)

  const busy = createFirm.isPending || createAccountant.isPending

  // Field-level validity (only surfaced after a save attempt).
  const firmNameInvalid = attempted && !firmName.trim()
  const acctNameInvalid = attempted && !acctName.trim()
  const passInvalid = attempted && acctPass.trim().length < 10

  function openModal() {
    setFirmName('')
    setAcctName('')
    setAcctUser('')
    setAcctPass(generatePassword())
    setCreated(null)
    setError(null)
    setAttempted(false)
    setOpen(true)
  }

  async function handleCreate() {
    setError(null)
    setAttempted(true)
    const name = firmName.trim()
    const username = acctUser.trim() || `${slug(name)}_admin`
    if (!name || !acctName.trim() || acctPass.trim().length < 10) return
    try {
      const firm = await createFirm.mutateAsync({ name })
      await createAccountant.mutateAsync({
        firmId: firm.id,
        username,
        password: acctPass,
        full_name: acctName.trim(),
      })
      setCreated({ firm, username, password: acctPass })
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message.replace(/^[A-Z]+ \/[^:]+: \d+: /, '')
          : 'Could not create the firm. Please try again.',
      )
    }
  }

  return (
    <div className="capsule-page">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h2 className="capsule-page__title">Firms</h2>
        <Button renderIcon={Add} onClick={openModal} data-testid="new-firm">
          New firm
        </Button>
      </div>

      <p className="capsule-hint" style={{ marginTop: '0.25rem' }}>
        Each firm is an isolated accounting practice with its own accountants and
        clients. Create a firm and its first accountant here, then sign in as that
        accountant to add clients.
      </p>

      {isError && (
        <InlineNotification
          kind="error"
          title="Could not load firms"
          lowContrast
          hideCloseButton
        />
      )}

      {isLoading ? (
        <Tile>
          <SkeletonText paragraph lineCount={3} />
        </Tile>
      ) : (firms?.length ?? 0) === 0 ? (
        <Tile className="capsule-empty" data-testid="firms-empty">
          <h4>No firms yet</h4>
          <p>Create your first firm to get started.</p>
        </Tile>
      ) : (
        <div className="capsule-stats" data-testid="firms-grid">
          {firms!.map((f) => (
            <ClickableTile
              key={f.id}
              className="capsule-stat"
              data-testid={`firm-${f.id}`}
              onClick={() => navigate(`/firms/${f.id}`)}
            >
              <div className="capsule-stat__icon">
                <Enterprise size={24} />
              </div>
              <div className="capsule-stat__value" style={{ fontSize: '1.25rem' }}>
                {f.name}
              </div>
              <div className="capsule-stat__label">{f.slug}</div>
              <div style={{ marginTop: '0.5rem' }}>
                <Tag type={f.is_active === false ? 'gray' : 'green'} size="sm">
                  {f.is_active === false ? 'Inactive' : 'Active'}
                </Tag>
              </div>
            </ClickableTile>
          ))}
        </div>
      )}

      <Modal
        open={open}
        modalHeading={created ? 'Firm created' : 'New firm'}
        primaryButtonText={created ? 'Done' : 'Create firm'}
        secondaryButtonText={created ? undefined : 'Cancel'}
        primaryButtonDisabled={!created && busy}
        onRequestClose={() => setOpen(false)}
        onRequestSubmit={created ? () => setOpen(false) : handleCreate}
        onSecondarySubmit={() => setOpen(false)}
        data-testid="new-firm-modal"
      >
        {created ? (
          <Stack gap={5}>
            <InlineNotification
              kind="success"
              title={`${created.firm.name} is ready`}
              subtitle="Sign in with the accountant login below to add clients. Change the password after first sign-in."
              lowContrast
              hideCloseButton
            />
            <div>
              <p className="cds--label">Sign-in URL</p>
              <CodeSnippet type="single">{window.location.origin}</CodeSnippet>
              <p className="cds--label" style={{ marginTop: '0.5rem' }}>
                Accountant username
              </p>
              <CodeSnippet type="single" data-testid="acct-username">
                {created.username}
              </CodeSnippet>
              <p className="cds--label" style={{ marginTop: '0.5rem' }}>
                Accountant password
              </p>
              <CodeSnippet type="single" data-testid="acct-password">
                {created.password}
              </CodeSnippet>
            </div>
          </Stack>
        ) : (
          <Stack gap={5}>
            {error && (
              <InlineNotification
                kind="error"
                title="Could not create firm"
                subtitle={error}
                lowContrast
                hideCloseButton
              />
            )}
            <TextInput
              id="firm-name"
              labelText={requiredLabel('Firm name')}
              placeholder="e.g. Kiloctet Accounting"
              value={firmName}
              onChange={(e) => setFirmName(e.target.value)}
              invalid={firmNameInvalid}
              invalidText="Firm name is required."
            />
            <TextInput
              id="acct-name"
              labelText={requiredLabel('Accountant full name')}
              placeholder="e.g. Sam Rivera"
              value={acctName}
              onChange={(e) => setAcctName(e.target.value)}
              invalid={acctNameInvalid}
              invalidText="Accountant full name is required."
            />
            <TextInput
              id="acct-user"
              labelText="Accountant username (optional)"
              helperText="Used to sign in. Leave blank to auto-generate from the firm name."
              placeholder={firmName ? `${slug(firmName)}_admin` : 'auto'}
              value={acctUser}
              onChange={(e) => setAcctUser(e.target.value)}
            />
            <TextInput
              id="acct-pass"
              labelText={requiredLabel('Accountant password')}
              helperText="Auto-generated — you can edit it. At least 10 characters."
              value={acctPass}
              onChange={(e) => setAcctPass(e.target.value)}
              invalid={passInvalid}
              invalidText="Password must be at least 10 characters."
            />
          </Stack>
        )}
      </Modal>
    </div>
  )
}
