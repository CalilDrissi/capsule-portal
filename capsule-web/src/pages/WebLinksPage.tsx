import { Tag } from '@carbon/react'
import SimpleCrud from '../components/SimpleCrud'
import {
  useWebLinks,
  useCreateWebLink,
  useUpdateWebLink,
  useDeleteWebLink,
  type WebLink,
} from '../api/adminConfig'

export default function WebLinksPage() {
  const { data, isLoading, isError } = useWebLinks()
  const create = useCreateWebLink()
  const update = useUpdateWebLink()
  const del = useDeleteWebLink()

  return (
    <SimpleCrud<WebLink>
      title="Liens web"
      items={data?.results ?? []}
      isLoading={isLoading}
      isError={isError}
      busy={create.isPending || update.isPending}
      columns={[
        { key: 'label', header: 'Libellé', render: (i) => i.label },
        { key: 'template', header: 'URL modèle', render: (i) => i.template },
        {
          key: 'enabled',
          header: 'Activé',
          render: (i) =>
            i.enabled ? <Tag type="green">Activé</Tag> : <Tag type="gray">Désactivé</Tag>,
        },
      ]}
      fields={[
        { name: 'label', label: 'Libellé', required: true },
        { name: 'template', label: 'URL modèle', required: true },
        { name: 'enabled', label: 'Activé', type: 'toggle' },
      ]}
      toInitial={(i) => ({
        label: i?.label ?? '',
        template: i?.template ?? '',
        enabled: i?.enabled ?? true,
      })}
      onCreate={(v) =>
        create.mutate({
          label: String(v.label),
          template: String(v.template),
          enabled: !!v.enabled,
        })
      }
      onUpdate={(id, v) =>
        update.mutate({
          id,
          body: { label: String(v.label), template: String(v.template), enabled: !!v.enabled },
        })
      }
      onDelete={(id) => del.mutate(id)}
    />
  )
}
