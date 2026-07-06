import { useState } from 'react'
import {
  Button,
  Dropdown,
  Modal,
  Stack,
  Tag,
} from '@carbon/react'
import { Catalog } from '@carbon/icons-react'
import SimpleCrud from '../components/SimpleCrud'
import {
  useDocumentTypesAdmin,
  useCreateDocumentType,
  useUpdateDocumentType,
  useDeleteDocumentType,
  useDocTypeMetadataTypes,
  useAddDocTypeMetadataType,
  useRemoveDocTypeMetadataType,
  useMetadataTypes,
  type DocumentTypeFull,
  type MetadataType,
} from '../api/adminConfig'

function MetadataAssocModal({ typeId, onClose }: { typeId: number; onClose: () => void }) {
  const { data: assoc } = useDocTypeMetadataTypes(typeId)
  const { data: allTypes } = useMetadataTypes()
  const add = useAddDocTypeMetadataType(typeId)
  const remove = useRemoveDocTypeMetadataType(typeId)
  const [picked, setPicked] = useState<MetadataType | null>(null)
  const assigned = assoc?.results ?? []

  return (
    <Modal
      open
      modalHeading="Metadata types for this document type"
      primaryButtonText="Done"
      onRequestSubmit={onClose}
      onRequestClose={onClose}
    >
      <Stack gap={5}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {assigned.length === 0 && <p>None assigned.</p>}
          {assigned.map((a) => (
            <Tag key={a.id} filter onClose={() => remove.mutate(a.id)}>
              {a.metadata_type?.label}
            </Tag>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
          <Dropdown
            id="mt-pick"
            titleText="Add metadata type"
            label="Choose"
            style={{ flex: 1 }}
            items={(allTypes?.results ?? []).filter(
              (t) => !assigned.some((a) => a.metadata_type?.id === t.id),
            )}
            itemToString={(t) => (t ? (t as MetadataType).label : '')}
            selectedItem={picked}
            onChange={({ selectedItem }) => setPicked(selectedItem as MetadataType)}
          />
          <Button
            disabled={!picked || add.isPending}
            onClick={() => picked && add.mutate(picked.id)}
          >
            Add
          </Button>
        </div>
      </Stack>
    </Modal>
  )
}

export default function DocumentTypesPage() {
  const { data, isLoading, isError } = useDocumentTypesAdmin()
  const create = useCreateDocumentType()
  const update = useUpdateDocumentType()
  const del = useDeleteDocumentType()
  const [assocType, setAssocType] = useState<number | null>(null)

  return (
    <>
      <SimpleCrud<DocumentTypeFull>
        title="Document types"
        items={data?.results ?? []}
        isLoading={isLoading}
        isError={isError}
        busy={create.isPending || update.isPending}
        columns={[
          { key: 'label', header: 'Label', render: (i) => i.label },
          {
            key: 'trash',
            header: 'Trash period',
            render: (i) =>
              i.trash_time_period ? `${i.trash_time_period} ${i.trash_time_unit}` : '—',
          },
        ]}
        fields={[{ name: 'label', label: 'Label', required: true }]}
        toInitial={(i) => ({ label: i?.label ?? '' })}
        onCreate={(v) => create.mutate({ label: String(v.label) })}
        onUpdate={(id, v) => update.mutate({ id, body: { label: String(v.label) } })}
        onDelete={(id) => del.mutate(id)}
        extraRowActions={(item) => (
          <Button
            kind="ghost"
            size="sm"
            hasIconOnly
            iconDescription="Metadata types"
            renderIcon={Catalog}
            onClick={() => setAssocType(item.id)}
          />
        )}
      />
      {assocType != null && (
        <MetadataAssocModal typeId={assocType} onClose={() => setAssocType(null)} />
      )}
    </>
  )
}
