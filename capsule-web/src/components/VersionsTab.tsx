import {
  DataTable,
  InlineLoading,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tile,
} from '@carbon/react'
import { useDocumentVersions } from '../api/queries'

const headers = [
  { key: 'id', header: 'ID' },
  { key: 'active', header: 'Active' },
  { key: 'timestamp', header: 'Created' },
]

export default function VersionsTab({ docId }: { docId: number }) {
  const { data, isLoading } = useDocumentVersions(docId)
  if (isLoading) return <InlineLoading description="Loading versions…" />

  const versions = data?.results ?? []
  if (versions.length === 0) return <Tile>No versions.</Tile>

  const rows = versions.map((v) => ({
    id: String(v.id),
    active: v.active ? 'Yes' : 'No',
    timestamp: v.timestamp ? new Date(v.timestamp).toLocaleString('fr-FR') : '—',
  }))

  return (
    <DataTable rows={rows} headers={headers}>
      {({ rows, headers, getHeaderProps, getRowProps, getTableProps }) => (
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
              {rows.map((row) => {
                const { key, ...rest } = getRowProps({ row })
                return (
                  <TableRow key={key} {...rest}>
                    {row.cells.map((cell) => (
                      <TableCell key={cell.id}>{cell.value}</TableCell>
                    ))}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </DataTable>
  )
}
