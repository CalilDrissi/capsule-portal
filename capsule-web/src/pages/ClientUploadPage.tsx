import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Button,
  DatePicker,
  DatePickerInput,
  FileUploaderDropContainer,
  FileUploaderItem,
  InlineNotification,
  Select,
  SelectItem,
  Stack,
  TextInput,
  Tile,
} from '@carbon/react'
import { applyUploadMetadata, uploadDocument } from '../api/client'
import { useAppStore } from '../store/useAppStore'
import { notify } from '../store/useNotifications'
import PageBreadcrumb from '../components/PageBreadcrumb'

// Fallback category list used only when the firm has not configured its own
// categories (whoami returns an empty list).
const FALLBACK_CATEGORIES = [
  'Invoice',
  'Receipt',
  'Bank statement',
  'Tax document',
  'Contract',
  'Other',
]

// Accepted upload formats. Plain text/CSV are intentionally excluded — Mayan's
// page-count step can fail on them; real document formats are supported.
const ACCEPTED_EXTENSIONS = [
  '.pdf',
  '.png',
  '.jpg',
  '.jpeg',
  '.tif',
  '.tiff',
  '.gif',
  '.bmp',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.odt',
  '.ods',
  '.odp',
]
const ACCEPTED_LABEL = 'PDF, images, or Office documents'

function isAcceptedFile(name: string): boolean {
  const lower = name.toLowerCase()
  return ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext))
}

export default function ClientUploadPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  // Upload context is resolved server-side by whoami (clients can't list
  // /document_types/ or /sources/ themselves).
  const inferredTypeId = useAppStore((s) => s.documentTypeId)
  const sourceId = useAppStore((s) => s.sourceId) ?? 1
  // The firm's configurable categories (from whoami); fall back to a static
  // list only when the firm has none configured.
  const firmCategories = useAppStore((s) => s.categories)
  const categories =
    firmCategories.length > 0 ? firmCategories : FALLBACK_CATEGORIES
  const categoryTypeId = useAppStore((s) => s.categoryMetadataTypeId)
  const documentDateTypeId = useAppStore((s) => s.documentDateMetadataTypeId)

  const [file, setFile] = useState<File | null>(null)
  const [label, setLabel] = useState('')
  const [category, setCategory] = useState(categories[0])
  const [docDate, setDocDate] = useState<string>('')

  const mutation = useMutation({
    meta: { successMessage: 'Document uploaded' },
    mutationFn: async () => {
      if (!file) throw new Error('Choose a file')
      if (inferredTypeId == null)
        throw new Error(
          'Could not determine your firm document type. Please contact your accountant.',
        )
      const extra: Record<string, unknown> = {}
      if (category) extra.category = category
      if (docDate) extra.document_date = docDate
      const effectiveLabel = label || file.name
      await uploadDocument(
        sourceId,
        inferredTypeId,
        file,
        effectiveLabel,
        extra,
      )
      // Persist the firm category + document-date metadata onto the new
      // document so the By-period / Timeline views can group by real dates.
      await applyUploadMetadata({
        label: effectiveLabel,
        categoryTypeId,
        documentDateTypeId,
        category,
        documentDate: docDate,
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['cabinet_documents'] })
      await queryClient.invalidateQueries({ queryKey: ['documents'] })
      notify.success('Document uploaded', 'It is now visible in your workspace.')
      navigate('/workspace')
    },
  })

  return (
    <div className="capsule-page" style={{ maxWidth: '40rem' }}>
      <PageBreadcrumb
        items={[
          { label: 'My documents', to: '/workspace' },
          { label: 'Upload' },
        ]}
      />
      <h2 className="capsule-page__title">Upload document</h2>
      <Tile>
        <Stack gap={6}>
          {mutation.isError && (
            <InlineNotification
              kind="error"
              title="Upload failed"
              subtitle={(mutation.error as Error)?.message}
              lowContrast
            />
          )}

          <div>
            <p className="cds--label">File</p>
            <FileUploaderDropContainer
              labelText={`Drag and drop a file here or click to upload (${ACCEPTED_LABEL})`}
              accept={ACCEPTED_EXTENSIONS}
              multiple={false}
              onAddFiles={(_e, { addedFiles }) => {
                const f = addedFiles?.[0] ?? null
                // Guard drag-drop, which bypasses the `accept` filter.
                if (f && !isAcceptedFile(f.name)) {
                  notify.error(
                    'Unsupported file type',
                    `Please upload a ${ACCEPTED_LABEL}.`,
                  )
                  return
                }
                setFile(f)
              }}
            />
            <p className="cds--form__helper-text">Accepted: {ACCEPTED_LABEL}.</p>
            {file && (
              <FileUploaderItem
                name={file.name}
                status="edit"
                onDelete={() => setFile(null)}
              />
            )}
          </div>

          <Select
            id="upload-category"
            labelText="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {categories.map((c) => (
              <SelectItem key={c} value={c} text={c} />
            ))}
          </Select>

          <DatePicker
            datePickerType="single"
            dateFormat="Y-m-d"
            value={docDate}
            onChange={(dates) => {
              const d = dates?.[0]
              setDocDate(d ? d.toISOString().slice(0, 10) : '')
            }}
          >
            <DatePickerInput
              id="upload-document-date"
              labelText="Document date"
              placeholder="yyyy-mm-dd"
              // Also honor a directly-typed ISO date so the value is captured
              // even if the flatpickr calendar onChange does not fire.
              onChange={(e) => {
                const v = e.target.value.trim()
                if (/^\d{4}-\d{2}-\d{2}$/.test(v)) setDocDate(v)
              }}
            />
          </DatePicker>

          <TextInput
            id="upload-label"
            labelText="Label (optional)"
            placeholder="Defaults to the file name"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />

          <Button
            onClick={() => mutation.mutate()}
            disabled={!file || mutation.isPending}
            data-testid="upload-submit"
          >
            {mutation.isPending ? 'Uploading…' : 'Upload'}
          </Button>
        </Stack>
      </Tile>
    </div>
  )
}
