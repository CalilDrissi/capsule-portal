import { useState } from 'react'
import {
  DataTable,
  DataTableSkeleton,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tile,
} from '@carbon/react'
import { useEvents } from '../api/adminConfig'

/** Event fields (verb/actor/target) come back as nested objects; pull the first
 *  present human-readable key, falling back to a string or em dash. */
function pick(v: unknown, keys: string[]): string {
  if (v == null) return '—'
  if (typeof v === 'string') return v
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>
    for (const k of keys) {
      if (typeof o[k] === 'string' && o[k]) return o[k] as string
    }
    if (o.id != null) return `#${o.id}`
  }
  return String(v)
}

const headers = [
  { key: 'verb', header: 'Événement' },
  { key: 'actor', header: 'Acteur' },
  { key: 'target', header: 'Cible' },
  { key: 'timestamp', header: 'Date' },
]

export default function EventsPage() {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const { data, isLoading, isError } = useEvents(page, pageSize)

  return (
    <div className="capsule-page">
      <h2 className="capsule-page__title">Événements</h2>
      {isLoading ? (
        <DataTableSkeleton columnCount={4} rowCount={10} showHeader={false} />
      ) : isError ? (
        <Tile>Échec du chargement des événements.</Tile>
      ) : (
        <>
          <DataTable
            rows={(data?.results ?? []).map((e) => ({
              id: String(e.id),
              verb: pick(e.verb, ['label', 'id']).replace(/[._]/g, ' '),
              actor: pick(e.actor, ['label', 'username', 'email']),
              target: pick(e.target, ['label']),
              timestamp: e.timestamp ? new Date(e.timestamp).toLocaleString('fr-FR') : '—',
            }))}
            headers={headers}
          >
            {({ rows, headers, getHeaderProps, getTableProps }) => (
              <TableContainer>
                <Table {...getTableProps()}>
                  <TableHead>
                    <TableRow>
                      {headers.map((h) => {
                        const { key, ...rest } = getHeaderProps({ header: h })
                        return (
                          <TableHeader key={key} {...rest}>
                            {h.header}
                          </TableHeader>
                        )
                      })}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow key={row.id}>
                        {row.cells.map((cell) => (
                          <TableCell key={cell.id}>{cell.value}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </DataTable>
          <Pagination
            page={page}
            pageSize={pageSize}
            pageSizes={[25, 50, 100]}
            totalItems={data?.count ?? 0}
            onChange={({ page: p, pageSize: ps }) => {
              setPage(p)
              setPageSize(ps)
            }}
          />
        </>
      )}
    </div>
  )
}
