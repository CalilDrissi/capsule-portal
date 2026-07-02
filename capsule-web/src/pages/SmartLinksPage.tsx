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
      title="Smart links"
      items={data?.results ?? []}
      isLoading={isLoading}
      isError={isError}
      busy={create.isPending || update.isPending}
      columns={[
        { key: 'label', header: 'Label', render: (i) => i.label },
        { key: 'dynamic_label', header: 'Dynamic label', render: (i) => i.dynamic_label || '—' },
        {
          key: 'enabled',
          header: 'Enabled',
          render: (i) =>
            i.enabled ? <Tag type="green">Enabled</Tag> : <Tag type="gray">Disabled</Tag>,
        },
      ]}
      fields={[
        { name: 'label', label: 'Label' },
        { name: 'dynamic_label', label: 'Dynamic label (template)' },
        { name: 'enabled', label: 'Enabled', type: 'toggle' },
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
