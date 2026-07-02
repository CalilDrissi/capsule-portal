import { useQueries } from '@tanstack/react-query'
import { Accordion, AccordionItem, SkeletonText, Tile } from '@carbon/react'
import { apiGet } from '../api/client'
import type { DocumentMetadata, DocumentSummary, Paginated } from '../api/types'
import DocumentsTable from './DocumentsTable'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December',
]

/**
 * Resolve the effective date for a document: prefer the firm `document_date`
 * metadata value (an ISO "YYYY-MM-DD" string) when present, else fall back to
 * `datetime_created`. Returns a Date or null.
 */
function effectiveDate(
  doc: DocumentSummary,
  metadata: DocumentMetadata[] | undefined,
): Date | null {
  const docDate = metadata?.find((m) =>
    /document_date/i.test(m.metadata_type?.name ?? ''),
  )?.value
  const raw = docDate || doc.datetime_created
  if (!raw) return null
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? null : d
}

interface PeriodNode {
  key: string
  label: string
  docs: DocumentSummary[]
  children: Map<string, PeriodNode>
}

function emptyNode(key: string, label: string): PeriodNode {
  return { key, label, docs: [], children: new Map() }
}

/**
 * Client-side period grouping of a client's documents into Year → Month
 * (the common, permission-safe view). Renders a collapsible Carbon Accordion
 * per year, each containing a month section with a DocumentsTable. Document
 * dates prefer the `document_date` metadata, falling back to creation date.
 */
export default function PeriodGroupedDocuments({
  documents,
  emptyTestId,
  linkBase,
}: {
  documents: DocumentSummary[]
  emptyTestId?: string
  linkBase?: string
}) {
  // Fetch each document's metadata to resolve its effective date. The set is
  // small (a single client's docs) so per-document fetches are acceptable and
  // avoid index/permission complexity.
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

  // Build a Year → Month tree.
  const root = new Map<string, PeriodNode>()
  const undated = emptyNode('undated', 'Undated')

  documents.forEach((doc, i) => {
    const metadata = metaQueries[i]?.data?.results
    const date = effectiveDate(doc, metadata)
    if (!date) {
      undated.docs.push(doc)
      return
    }
    const year = String(date.getFullYear())
    const monthKey = String(date.getMonth())
    let yearNode = root.get(year)
    if (!yearNode) {
      yearNode = emptyNode(year, year)
      root.set(year, yearNode)
    }
    let monthNode = yearNode.children.get(monthKey)
    if (!monthNode) {
      monthNode = emptyNode(monthKey, MONTHS[date.getMonth()])
      yearNode.children.set(monthKey, monthNode)
    }
    monthNode.docs.push(doc)
    yearNode.docs.push(doc)
  })

  const years = Array.from(root.values()).sort((a, b) =>
    b.key.localeCompare(a.key),
  )
  if (undated.docs.length) years.push(undated)

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
        <h4>No documents yet</h4>
        <p>Documents will appear here grouped by period.</p>
      </Tile>
    )
  }

  return (
    <Accordion data-testid="by-period-accordion">
      {years.map((yearNode) => (
        <AccordionItem
          key={yearNode.key}
          title={`${yearNode.label} (${yearNode.docs.length})`}
          open={years.length <= 2}
        >
          {yearNode.children.size === 0 ? (
            <DocumentsTable documents={yearNode.docs} linkBase={linkBase} />
          ) : (
            Array.from(yearNode.children.values())
              .sort((a, b) => Number(b.key) - Number(a.key))
              .map((monthNode) => (
                <div key={monthNode.key} style={{ marginBottom: '1.5rem' }}>
                  <h5 style={{ margin: '0.5rem 0' }}>
                    {monthNode.label} ({monthNode.docs.length})
                  </h5>
                  <DocumentsTable
                    documents={monthNode.docs}
                    linkBase={linkBase}
                  />
                </div>
              ))
          )}
        </AccordionItem>
      ))}
    </Accordion>
  )
}
