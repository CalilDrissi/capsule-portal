import SimpleCrud from '../components/SimpleCrud'
import {
  useMetadataTypes,
  useCreateMetadataType,
  useUpdateMetadataType,
  useDeleteMetadataType,
  type MetadataType,
} from '../api/adminConfig'

export default function MetadataTypesPage() {
  const { data, isLoading, isError } = useMetadataTypes()
  const create = useCreateMetadataType()
  const update = useUpdateMetadataType()
  const del = useDeleteMetadataType()

  return (
    <SimpleCrud<MetadataType>
      title="Types de métadonnée"
      items={data?.results ?? []}
      isLoading={isLoading}
      isError={isError}
      busy={create.isPending || update.isPending}
      columns={[
        { key: 'name', header: 'Nom', render: (i) => i.name },
        { key: 'label', header: 'Libellé', render: (i) => i.label },
        { key: 'default', header: 'Valeur par défaut', render: (i) => i.default || '—' },
      ]}
      fields={[
        { name: 'name', label: 'Nom (interne, sans espaces)', required: true },
        { name: 'label', label: 'Libellé', required: true },
        { name: 'default', label: 'Valeur par défaut' },
      ]}
      toInitial={(i) => ({
        name: i?.name ?? '',
        label: i?.label ?? '',
        default: i?.default ?? '',
      })}
      onCreate={(v) =>
        create.mutate({
          name: String(v.name),
          label: String(v.label),
          default: (v.default as string) || undefined,
        })
      }
      onUpdate={(id, v) =>
        update.mutate({
          id,
          body: { label: String(v.label), default: (v.default as string) || null },
        })
      }
      onDelete={(id) => del.mutate(id)}
    />
  )
}
