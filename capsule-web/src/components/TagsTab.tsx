import { useState } from 'react'
import {
  Button,
  Dropdown,
  InlineLoading,
  Stack,
  Tag as CarbonTag,
  Tile,
} from '@carbon/react'
import { Add, Close } from '@carbon/icons-react'
import {
  useAllTags,
  useAttachTag,
  useDocumentTags,
  useRemoveTag,
} from '../api/queries'
import type { Tag } from '../api/types'

export default function TagsTab({ docId }: { docId: number }) {
  const { data: docTags, isLoading } = useDocumentTags(docId)
  const { data: allTags } = useAllTags()
  const attach = useAttachTag(docId)
  const remove = useRemoveTag(docId)
  const [picked, setPicked] = useState<Tag | null>(null)

  if (isLoading) return <InlineLoading description="Loading tags…" />

  const attached = docTags?.results ?? []
  const attachedIds = new Set(attached.map((t) => t.id))
  const attachable = (allTags?.results ?? []).filter(
    (t) => !attachedIds.has(t.id),
  )

  return (
    <Stack gap={5}>
      <div data-testid="tags-list">
        {attached.length === 0 ? (
          <Tile>No tags attached.</Tile>
        ) : (
          attached.map((t) => (
            <span
              key={t.id}
              data-testid={`tag-${t.id}`}
              style={{ display: 'inline-flex', alignItems: 'center' }}
            >
              <CarbonTag type="blue">{t.label}</CarbonTag>
              <Button
                kind="ghost"
                size="sm"
                hasIconOnly
                iconDescription={`Remove ${t.label}`}
                renderIcon={Close}
                data-testid={`tag-remove-${t.id}`}
                disabled={remove.isPending}
                onClick={() => remove.mutate(t.id)}
              />
            </span>
          ))
        )}
      </div>

      {attachable.length > 0 && (
        <Tile>
          <Stack gap={4}>
            <strong>Attach a tag</strong>
            <Dropdown
              id="tag-pick"
              titleText="Tag"
              label="Choose a tag"
              items={attachable}
              selectedItem={picked}
              itemToString={(i) => (i ? i.label : '')}
              onChange={({ selectedItem }) => setPicked(selectedItem ?? null)}
            />
            <Button
              renderIcon={Add}
              disabled={!picked || attach.isPending}
              data-testid="tag-attach-btn"
              onClick={() =>
                picked &&
                attach.mutate(picked.id, { onSuccess: () => setPicked(null) })
              }
            >
              Attach tag
            </Button>
          </Stack>
        </Tile>
      )}
    </Stack>
  )
}
