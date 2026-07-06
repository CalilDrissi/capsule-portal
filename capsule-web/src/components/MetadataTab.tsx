import { useState } from 'react'
import {
  Button,
  Dropdown,
  InlineLoading,
  Stack,
  TextInput,
  Tile,
} from '@carbon/react'
import { Add, Edit, Save, TrashCan } from '@carbon/icons-react'
import {
  useAddMetadata,
  useDeleteMetadata,
  useDocumentMetadata,
  useDocumentTypeMetadataTypes,
  useUpdateMetadata,
} from '../api/queries'
import { requiredLabel } from '../lib/forms'
import type { DocumentTypeMetadataType } from '../api/types'

export default function MetadataTab({
  docId,
  documentTypeId,
}: {
  docId: number
  documentTypeId: number | undefined
}) {
  const { data, isLoading } = useDocumentMetadata(docId)
  const { data: available } = useDocumentTypeMetadataTypes(documentTypeId)
  const addMeta = useAddMetadata(docId)
  const updateMeta = useUpdateMetadata(docId)
  const deleteMeta = useDeleteMetadata(docId)

  const [editing, setEditing] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')
  const [newType, setNewType] = useState<DocumentTypeMetadataType | null>(null)
  const [newValue, setNewValue] = useState('')
  const [attempted, setAttempted] = useState(false)

  const newTypeInvalid = attempted && !newType
  const newValueInvalid = attempted && !newValue.trim()

  function handleAdd() {
    setAttempted(true)
    if (!newType || !newValue.trim()) return
    addMeta.mutate(
      {
        metadata_type_id: newType.metadata_type.id,
        value: newValue,
      },
      {
        onSuccess: () => {
          setNewType(null)
          setNewValue('')
          setAttempted(false)
        },
      },
    )
  }

  if (isLoading) return <InlineLoading description="Chargement des métadonnées…" />

  const existing = data?.results ?? []
  const usedTypeIds = new Set(existing.map((m) => m.metadata_type.id))
  const addable = (available?.results ?? []).filter(
    (a) => !usedTypeIds.has(a.metadata_type.id),
  )

  return (
    <Stack gap={5}>
      {existing.length === 0 && (
        <Tile>Aucune valeur de métadonnée définie pour ce document.</Tile>
      )}
      {existing.map((m) => (
        <Tile key={m.id} className="capsule-meta-row" data-testid={`meta-${m.id}`}>
          <strong>{m.metadata_type.label}</strong>
          {editing === m.id ? (
            <div className="capsule-meta-edit">
              <TextInput
                id={`meta-edit-${m.id}`}
                labelText=""
                hideLabel
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
              />
              <Button
                size="sm"
                renderIcon={Save}
                disabled={updateMeta.isPending}
                onClick={() =>
                  updateMeta.mutate(
                    { metadataId: m.id, value: editValue },
                    { onSuccess: () => setEditing(null) },
                  )
                }
              >
                Enregistrer
              </Button>
              <Button size="sm" kind="ghost" onClick={() => setEditing(null)}>
                Annuler
              </Button>
            </div>
          ) : (
            <div className="capsule-meta-edit">
              <span data-testid={`meta-value-${m.id}`}>{m.value || '—'}</span>
              <Button
                size="sm"
                kind="ghost"
                hasIconOnly
                iconDescription="Modifier"
                renderIcon={Edit}
                data-testid={`meta-edit-btn-${m.id}`}
                onClick={() => {
                  setEditing(m.id)
                  setEditValue(m.value ?? '')
                }}
              />
              <Button
                size="sm"
                kind="ghost"
                hasIconOnly
                iconDescription="Retirer"
                renderIcon={TrashCan}
                onClick={() => deleteMeta.mutate(m.id)}
              />
            </div>
          )}
        </Tile>
      ))}

      {addable.length > 0 && (
        <Tile>
          <Stack gap={4}>
            <strong>Ajouter une métadonnée</strong>
            <Dropdown
              id="meta-add-type"
              titleText={requiredLabel('Type')}
              label="Choisir un type de métadonnée"
              items={addable}
              selectedItem={newType}
              itemToString={(i) => (i ? i.metadata_type.label : '')}
              onChange={({ selectedItem }) => setNewType(selectedItem ?? null)}
              invalid={newTypeInvalid}
              invalidText="Le type est obligatoire."
            />
            <TextInput
              id="meta-add-value"
              labelText={requiredLabel('Valeur')}
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              invalid={newValueInvalid}
              invalidText="La valeur est obligatoire."
            />
            <Button
              renderIcon={Add}
              disabled={addMeta.isPending}
              data-testid="meta-add-btn"
              onClick={handleAdd}
            >
              Ajouter une métadonnée
            </Button>
          </Stack>
        </Tile>
      )}
    </Stack>
  )
}
