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
import { requiredLabel } from '../lib/forms'
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
  const [attempted, setAttempted] = useState(false)

  // Field-level validity (only surfaced after an upload attempt).
  const fileInvalid = attempted && !file
  const docTypeInvalid = attempted && !docType

  const mutation = useMutation({
    meta: { successMessage: 'Document importé' },
    mutationFn: () => {
      const sourceId = sources?.[0]?.id
      if (!sourceId) throw new Error("Aucune source d'importation disponible")
      if (!file) throw new Error('Choisissez un fichier')
      if (!docType) throw new Error('Choisissez un type de document')
      return uploadDocument(sourceId, docType.id, file, label || file.name)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['documents'] })
      navigate('/documents')
    },
  })

  function handleSubmit() {
    setAttempted(true)
    if (!file || !docType) return
    mutation.mutate()
  }

  return (
    <div className="capsule-page" style={{ maxWidth: '40rem' }}>
      <h2 className="capsule-page__title">Importer un document</h2>
      <Tile>
        <Stack gap={6}>
          {mutation.isError && (
            <InlineNotification
              kind="error"
              title="Échec de l'importation"
              subtitle={(mutation.error as Error)?.message}
              lowContrast
            />
          )}

          <div>
            <p className="cds--label">{requiredLabel('Fichier')}</p>
            <FileUploaderDropContainer
              labelText="Glissez-déposez un fichier ici ou cliquez pour importer"
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
            {fileInvalid && (
              <p className="cds--form-requirement" style={{ color: '#da1e28' }}>
                Un fichier est obligatoire.
              </p>
            )}
          </div>

          <Dropdown
            id="doc-type"
            titleText={requiredLabel('Type de document')}
            label="Sélectionnez un type de document"
            items={types}
            itemToString={(t) => (t ? (t as DocumentType).label : '')}
            selectedItem={docType}
            onChange={({ selectedItem }) => setDocType(selectedItem as DocumentType)}
            invalid={docTypeInvalid}
            invalidText="Le type de document est obligatoire."
          />

          <TextInput
            id="doc-label"
            labelText="Libellé (facultatif)"
            placeholder="Par défaut, le nom du fichier"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />

          <Button
            onClick={handleSubmit}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Importation…' : 'Importer'}
          </Button>
        </Stack>
      </Tile>
    </div>
  )
}
