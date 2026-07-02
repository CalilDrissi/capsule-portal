import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
  useAddDocumentToCabinet,
  useCabinets,
  useDocumentCabinets,
  useRemoveDocumentFromCabinet,
} from '../api/queries'
import type { Cabinet } from '../api/types'

/** Flatten the cabinet tree into a list of {id, full_path} for selection. */
function flatten(nodes: Cabinet[]): Cabinet[] {
  const out: Cabinet[] = []
  const walk = (ns: Cabinet[]) => {
    for (const n of ns) {
      out.push(n)
      if (n.children?.length) walk(n.children)
    }
  }
  walk(nodes)
  return out
}

export default function CabinetsTab({ docId }: { docId: number }) {
  const navigate = useNavigate()
  const { data: docCabinets, isLoading } = useDocumentCabinets(docId)
  const { data: allCabinets } = useCabinets()
  const add = useAddDocumentToCabinet()
  const remove = useRemoveDocumentFromCabinet()
  const [picked, setPicked] = useState<Cabinet | null>(null)

  if (isLoading) return <InlineLoading description="Loading cabinets…" />

  const inCabinets = docCabinets?.results ?? []
  const inIds = new Set(inCabinets.map((c) => c.id))
  const addable = flatten(allCabinets?.results ?? []).filter(
    (c) => !inIds.has(c.id),
  )

  return (
    <Stack gap={5}>
      <div data-testid="doc-cabinets-list">
        {inCabinets.length === 0 ? (
          <Tile>This document is not in any cabinet.</Tile>
        ) : (
          inCabinets.map((c) => (
            <span
              key={c.id}
              style={{ display: 'inline-flex', alignItems: 'center' }}
            >
              <CarbonTag
                type="green"
                onClick={() => navigate(`/cabinets/${c.id}`)}
                style={{ cursor: 'pointer' }}
              >
                {c.full_path}
              </CarbonTag>
              <Button
                kind="ghost"
                size="sm"
                hasIconOnly
                iconDescription={`Remove from ${c.label}`}
                renderIcon={Close}
                data-testid={`doc-cabinet-remove-${c.id}`}
                disabled={remove.isPending}
                onClick={() =>
                  remove.mutate({ cabinetId: c.id, documentId: docId })
                }
              />
            </span>
          ))
        )}
      </div>

      {addable.length > 0 && (
        <Tile>
          <Stack gap={4}>
            <strong>Add to a cabinet</strong>
            <Dropdown
              id="cabinet-pick"
              titleText="Cabinet"
              label="Choose a cabinet"
              items={addable}
              selectedItem={picked}
              itemToString={(i) => (i ? i.full_path : '')}
              onChange={({ selectedItem }) => setPicked(selectedItem ?? null)}
            />
            <Button
              renderIcon={Add}
              disabled={!picked || add.isPending}
              data-testid="doc-cabinet-add-btn"
              onClick={() =>
                picked &&
                add.mutate(
                  { cabinetId: picked.id, documentId: docId },
                  { onSuccess: () => setPicked(null) },
                )
              }
            >
              Add to cabinet
            </Button>
          </Stack>
        </Tile>
      )}
    </Stack>
  )
}
