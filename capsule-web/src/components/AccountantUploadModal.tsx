import { useState } from 'react'
import {
  Button,
  DatePicker,
  DatePickerInput,
  FileUploaderDropContainer,
  FileUploaderItem,
  InlineNotification,
  Modal,
  Select,
  SelectItem,
  Stack,
  TextInput,
} from '@carbon/react'
import { Add } from '@carbon/icons-react'
import { ApiError, uploadDocument } from '../api/client'
import { useAttachClientDocument } from '../api/queries'
import { useAppStore } from '../store/useAppStore'
import { requiredLabel } from '../lib/forms'

const ACCEPTED = ['.pdf', '.png', '.jpg', '.jpeg', '.gif', '.tiff', '.tif', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.odt', '.ods']
const ACCEPTED_LABEL = 'PDF, images ou documents Office'
const isAccepted = (name: string) => ACCEPTED.some((e) => name.toLowerCase().endsWith(e))
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Accountant "upload on behalf of a client" flow: upload via the firm's source,
 * then attach the new document to this client (files it into the client cabinet
 * with attribution + category/date). The upload is processed asynchronously, so
 * the attach is retried until the document exists.
 */
export default function AccountantUploadModal({
  clientId,
  onUploaded,
}: {
  clientId: number
  onUploaded: () => void
}) {
  const sourceId = useAppStore((s) => s.sourceId)
  const documentTypeId = useAppStore((s) => s.documentTypeId)
  const categories = useAppStore((s) => s.categories)
  const attach = useAttachClientDocument(clientId)

  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [category, setCategory] = useState('')
  const [documentDate, setDocumentDate] = useState('')
  const [label, setLabel] = useState('')
  const [attempted, setAttempted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  function reset() {
    setFile(null)
    setCategory('')
    setDocumentDate('')
    setLabel('')
    setAttempted(false)
    setError(null)
    setBusy(false)
    setOpen(false)
  }

  const fileInvalid = attempted && !file

  async function handleSubmit() {
    setAttempted(true)
    setError(null)
    if (!file) return
    if (sourceId == null || documentTypeId == null) {
      setError('L’import n’est pas configuré pour ce cabinet. Veuillez contacter le support.')
      return
    }
    setBusy(true)
    try {
      await uploadDocument(sourceId, documentTypeId, file, label || file.name)
      // The upload is processed asynchronously; retry the attach until the new
      // document exists (404 until then).
      let attached = false
      for (let i = 0; i < 8 && !attached; i++) {
        await sleep(i === 0 ? 1500 : 1200)
        try {
          await attach.mutateAsync({
            category: category || undefined,
            document_date: documentDate || undefined,
          })
          attached = true
        } catch (e) {
          if (e instanceof ApiError && e.status === 404) continue
          throw e
        }
      }
      if (!attached) {
        setError('Le document a été importé mais n’a pas encore pu être classé chez le client. Il devrait apparaître sous peu.')
        setBusy(false)
        return
      }
      onUploaded()
      reset()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'L’import a échoué. Veuillez réessayer.')
      setBusy(false)
    }
  }

  return (
    <>
      <Button
        renderIcon={Add}
        size="sm"
        onClick={() => setOpen(true)}
        data-testid="accountant-upload"
      >
        Importer un document
      </Button>
      <Modal
        open={open}
        modalHeading="Importer un document pour ce client"
        primaryButtonText={busy ? 'Import en cours…' : 'Importer'}
        secondaryButtonText="Annuler"
        primaryButtonDisabled={busy}
        onRequestClose={reset}
        onRequestSubmit={handleSubmit}
        onSecondarySubmit={reset}
        data-testid="accountant-upload-modal"
      >
        <Stack gap={5}>
          {error && (
            <InlineNotification
              kind="error"
              title="Impossible d’importer"
              subtitle={error}
              lowContrast
              hideCloseButton
            />
          )}
          <div>
            <p className="cds--label">{requiredLabel('Fichier')}</p>
            <FileUploaderDropContainer
              labelText={`Glissez-déposez un fichier ici ou cliquez pour importer (${ACCEPTED_LABEL})`}
              accept={ACCEPTED}
              multiple={false}
              onAddFiles={(_e, { addedFiles }) => {
                const f = addedFiles?.[0] ?? null
                if (f && !isAccepted(f.name)) {
                  setError(`Veuillez importer un fichier de type ${ACCEPTED_LABEL}.`)
                  return
                }
                setError(null)
                setFile(f)
              }}
            />
            {file && (
              <FileUploaderItem
                name={file.name}
                status="edit"
                onDelete={() => setFile(null)}
              />
            )}
            {fileInvalid && (
              <p className="cds--form-requirement" style={{ color: '#da1e28' }}>
                Un fichier est obligatoire.
              </p>
            )}
          </div>
          {categories.length > 0 && (
            <Select
              id="acct-upload-category"
              labelText="Catégorie"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <SelectItem value="" text="— Aucune —" />
              {categories.map((c) => (
                <SelectItem key={c} value={c} text={c} />
              ))}
            </Select>
          )}
          <DatePicker
            datePickerType="single"
            locale="fr"
            dateFormat="Y-m-d"
            value={documentDate}
            onChange={(dates: Date[]) => {
              const d = dates?.[0]
              setDocumentDate(d ? d.toISOString().slice(0, 10) : '')
            }}
          >
            <DatePickerInput
              id="acct-upload-date"
              labelText="Date du document (facultatif)"
              placeholder="aaaa-mm-jj"
            />
          </DatePicker>
          <TextInput
            id="acct-upload-label"
            labelText="Libellé (facultatif)"
            placeholder="Par défaut, le nom du fichier"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </Stack>
      </Modal>
    </>
  )
}
