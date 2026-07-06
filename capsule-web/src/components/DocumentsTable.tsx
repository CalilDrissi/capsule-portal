import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueries } from '@tanstack/react-query'
import {
  DataTable,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
} from '@carbon/react'
import { apiGet } from '../api/client'
import type {
  DocumentSummary,
  DocumentUploaders,
  Paginated,
  WorkflowInstance,
} from '../api/types'

const baseHeaders = [
  { key: 'label', header: 'Label' },
  { key: 'type', header: 'Type' },
  { key: 'created', header: 'Created' },
]

const statusHeader = { key: 'status', header: 'Status' }
const uploaderHeader = { key: 'uploader', header: 'Uploaded by' }

/** Carbon tag colour per Capsule status state. */
function statusTagType(state: string): 'gray' | 'blue' | 'magenta' | 'green' {
  if (/accept/i.test(state)) return 'green'
  if (/correction/i.test(state)) return 'magenta'
  if (/review/i.test(state)) return 'blue'
  return 'gray'
}

/**
 * Read-only documents DataTable shared across list/workspace pages. Sorts
 * across the full set and paginates client-side.
 *
 * - `linkBase` controls the row-click destination (default `/documents`); the
 *   client/accountant workspaces pass a role-reachable base so clients aren't
 *   sent to the accountant-only document detail route.
 * - `showStatus` adds a Status column rendered as a Carbon Tag, sourced from
 *   each document's Capsule status workflow instance.
 */
export default function DocumentsTable({
  documents,
  linkBase = '/documents',
  showStatus = false,
  uploaders,
}: {
  documents: DocumentSummary[]
  linkBase?: string
  showStatus?: boolean
  /** When provided, adds an "Uploaded by" column (doc id -> uploader). */
  uploaders?: DocumentUploaders
}) {
  const showUploader = !!uploaders
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Per-document status (current workflow state). Only fetched when the
  // Status column is shown. The set is a single client's docs so per-doc
  // fetches are acceptable.
  const statusQueries = useQueries({
    queries: showStatus
      ? documents.map((d) => ({
          queryKey: ['document_workflows', d.id] as const,
          queryFn: () =>
            apiGet<Paginated<WorkflowInstance>>(
              `/documents/${d.id}/workflow_instances/?page_size=10`,
            ),
        }))
      : [],
  })

  const statusById: Record<number, string> = {}
  if (showStatus) {
    documents.forEach((d, i) => {
      const inst = statusQueries[i]?.data?.results?.[0]
      if (inst?.current_state?.label) statusById[d.id] = inst.current_state.label
    })
  }

  const headers = [
    ...baseHeaders,
    ...(showStatus ? [statusHeader] : []),
    ...(showUploader ? [uploaderHeader] : []),
  ]

  const rows = documents.map((d) => ({
    id: String(d.id),
    label: d.label,
    type: d.document_type?.label ?? '—',
    created: d.datetime_created
      ? new Date(d.datetime_created).toLocaleString()
      : '—',
    status: statusById[d.id] ?? '—',
    uploader: uploaders?.[String(d.id)]?.display ?? '—',
  }))

  return (
    <>
      <DataTable rows={rows} headers={headers} isSortable>
        {({ rows, headers, getHeaderProps, getRowProps, getTableProps }) => {
          const pageRows = rows.slice((page - 1) * pageSize, page * pageSize)
          return (
            <TableContainer>
              <Table {...getTableProps()}>
                <TableHead>
                  <TableRow>
                    {headers.map((header) => {
                      const { key, ...rest } = getHeaderProps({ header })
                      return (
                        <TableHeader key={key} {...rest}>
                          {header.header}
                        </TableHeader>
                      )
                    })}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pageRows.map((row) => {
                    const { key, ...rest } = getRowProps({ row })
                    return (
                      <TableRow
                        key={key}
                        {...rest}
                        onClick={() => navigate(`${linkBase}/${row.id}`)}
                        style={{ cursor: 'pointer' }}
                      >
                        {row.cells.map((cell) => {
                          const isStatus = cell.info.header === 'status'
                          return (
                            <TableCell key={cell.id}>
                              {isStatus && cell.value && cell.value !== '—' ? (
                                <Tag
                                  type={statusTagType(cell.value)}
                                  data-testid={`doc-status-${row.id}`}
                                >
                                  {cell.value}
                                </Tag>
                              ) : (
                                cell.value
                              )}
                            </TableCell>
                          )
                        })}
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )
        }}
      </DataTable>
      {documents.length > pageSize && (
        <Pagination
          page={page}
          pageSize={pageSize}
          pageSizes={[10, 25, 50]}
          totalItems={documents.length}
          onChange={({ page: p, pageSize: ps }) => {
            setPage(p)
            setPageSize(ps)
          }}
        />
      )}
    </>
  )
}
