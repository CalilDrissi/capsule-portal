import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Button,
  Dropdown,
  FileUploaderDropContainer,
  FileUploaderItem,
  InlineNotification,
  Stack,
  TextInput,
  Tile,
} from '@carbon/react'
import { uploadDocument } from '../api/client'
import { useDocumentTypes, useUploadSources } from '../api/queries'
import type { DocumentType } from '../api/types'

export default function UploadPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: typesData } = useDocumentTypes()
  const { data: sources } = useUploadSources()
  const types = typesData?.results ?? []

  const [file, setFile] = useState<File | null>(null)
  const [docType, setDocType] = useState<DocumentType | null>(null)
  const [label, setLabel] = useState('')

  const mutation = useMutation({
    meta: { successMessage: 'Document uploaded' },
    mutationFn: () => {
      const sourceId = sources?.[0]?.id
      if (!sourceId) throw new Error('No upload source available')
      if (!file) throw new Error('Choose a file')
      if (!docType) throw new Error('Choose a document type')
      return uploadDocument(sourceId, docType.id, file, label || file.name)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['documents'] })
      navigate('/documents')
    },
  })

  return (
    <div className="capsule-page" style={{ maxWidth: '40rem' }}>
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
              labelText="Drag and drop a file here or click to upload"
              accept={[]}
              multiple={false}
              onAddFiles={(_e, { addedFiles }) => setFile(addedFiles?.[0] ?? null)}
            />
            {file && (
              <FileUploaderItem
                name={file.name}
                status="edit"
                onDelete={() => setFile(null)}
              />
            )}
          </div>

          <Dropdown
            id="doc-type"
            titleText="Document type"
            label="Select a document type"
            items={types}
            itemToString={(t) => (t ? (t as DocumentType).label : '')}
            selectedItem={docType}
            onChange={({ selectedItem }) => setDocType(selectedItem as DocumentType)}
          />

          <TextInput
            id="doc-label"
            labelText="Label (optional)"
            placeholder="Defaults to the file name"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />

          <Button
            onClick={() => mutation.mutate()}
            disabled={!file || !docType || mutation.isPending}
          >
            {mutation.isPending ? 'Uploading…' : 'Upload'}
          </Button>
        </Stack>
      </Tile>
    </div>
  )
}
