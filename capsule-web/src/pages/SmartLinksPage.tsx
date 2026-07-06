import { Tag } from '@carbon/react'
import SimpleCrud from '../components/SimpleCrud'
import {
  useSmartLinks,
  useCreateSmartLink,
  useUpdateSmartLink,
  useDeleteSmartLink,
  type SmartLink,
} from '../api/adminConfig'

export default function SmartLinksPage() {
  const { data, isLoading, isError } = useSmartLinks()
  const create = useCreateSmartLink()
  const update = useUpdateSmartLink()
  const del = useDeleteSmartLink()

  return (
    <SimpleCrud<SmartLink>
      title="Liens intelligents"
      items={data?.results ?? []}
      isLoading={isLoading}
      isError={isError}
      busy={create.isPending || update.isPending}
      columns={[
        { key: 'label', header: 'Libellé', render: (i) => i.label },
        { key: 'dynamic_label', header: 'Libellé dynamique', render: (i) => i.dynamic_label || '—' },
        {
          key: 'enabled',
          header: 'Activé',
          render: (i) =>
            i.enabled ? <Tag type="green">Activé</Tag> : <Tag type="gray">Désactivé</Tag>,
        },
      ]}
      fields={[
        { name: 'label', label: 'Libellé', required: true },
        { name: 'dynamic_label', label: 'Libellé dynamique (modèle)' },
        { name: 'enabled', label: 'Activé', type: 'toggle' },
      ]}
      toInitial={(i) => ({
        label: i?.label ?? '',
        dynamic_label: i?.dynamic_label ?? '',
        enabled: i?.enabled ?? true,
      })}
      onCreate={(v) =>
        create.mutate({
          label: String(v.label),
          dynamic_label: (v.dynamic_label as string) || undefined,
          enabled: !!v.enabled,
        })
      }
      onUpdate={(id, v) =>
        update.mutate({
          id,
          body: {
            label: String(v.label),
            dynamic_label: (v.dynamic_label as string) || '',
            enabled: !!v.enabled,
          },
        })
      }
      onDelete={(id) => del.mutate(id)}
    />
  )
}
