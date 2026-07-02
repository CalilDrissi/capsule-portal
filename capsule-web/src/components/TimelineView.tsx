import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueries } from '@tanstack/react-query'
import { SkeletonText, Tag, Tile } from '@carbon/react'
import { Document } from '@carbon/icons-react'
import { apiGet } from '../api/client'
import type { DocumentMetadata, DocumentSummary, Paginated } from '../api/types'

/**
 * A vertical timeline of a client's uploads in reverse-chronological order,
 * grouped by month. Each entry shows the document label, its category, and the
 * date. Accountants can click an entry to open the document; for clients the
 * entries are read-only.
 */
export default function TimelineView({
  documents,
  interactive = false,
  emptyTestId,
}: {
  documents: DocumentSummary[]
  interactive?: boolean
  emptyTestId?: string
}) {
  const navigate = useNavigate()

  const metaQueries = useQueries({
    queries: documents.map((d) => ({
      queryKey: ['document_metadata', d.id] as const,
      queryFn: () =>
        apiGet<Paginated<DocumentMetadata>>(
          `/documents/${d.id}/metadata/?page_size=100`,
        ),
    })),
  })

  const loading = metaQueries.some((q) => q.isLoading)

  const entries = useMemo(() => {
    return documents
      .map((doc, i) => {
        const metadata = metaQueries[i]?.data?.results
        const category = metadata?.find((m) =>
          /category/i.test(m.metadata_type?.name ?? ''),
        )?.value
        const docDate = metadata?.find((m) =>
          /document_date/i.test(m.metadata_type?.name ?? ''),
        )?.value
        const raw = docDate || doc.datetime_created
        const date = raw ? new Date(raw) : null
        return { doc, category, date }
      })
      .sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0))
    // metaQueries identity changes each render; gate on the data lengths.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documents, loading])

  if (loading) {
    return (
      <Tile>
        <SkeletonText paragraph lineCount={4} />
      </Tile>
    )
  }

  if (documents.length === 0) {
    return (
      <Tile className="capsule-empty" data-testid={emptyTestId}>
        <h4>No activity yet</h4>
        <p>Uploads will appear here as a timeline.</p>
      </Tile>
    )
  }

  // Group entries by "Month Year" preserving the reverse-chron order.
  const groups: { label: string; items: typeof entries }[] = []
  for (const entry of entries) {
    const label = entry.date
      ? entry.date.toLocaleDateString(undefined, {
          month: 'long',
          year: 'numeric',
        })
      : 'Undated'
    let group = groups[groups.length - 1]
    if (!group || group.label !== label) {
      group = { label, items: [] }
      groups.push(group)
    }
    group.items.push(entry)
  }

  return (
    <div className="capsule-timeline" data-testid="timeline">
      {groups.map((group) => (
        <div key={group.label} style={{ marginBottom: '1.5rem' }}>
          <h5 style={{ margin: '0 0 0.75rem' }}>{group.label}</h5>
          <div
            style={{
              borderLeft: '2px solid var(--cds-border-subtle, #e0e0e0)',
              paddingLeft: '1rem',
            }}
          >
            {group.items.map(({ doc, category, date }) => (
              <div
                key={doc.id}
                data-testid="timeline-entry"
                onClick={
                  interactive ? () => navigate(`/documents/${doc.id}`) : undefined
                }
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem 0',
                  cursor: interactive ? 'pointer' : 'default',
                }}
              >
                <Document size={20} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{doc.label}</div>
                  <div
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--cds-text-secondary, #6f6f6f)',
                    }}
                  >
                    {date ? date.toLocaleDateString() : 'No date'}
                  </div>
                </div>
                {category && <Tag type="blue">{category}</Tag>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
