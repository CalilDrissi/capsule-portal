import {
  Button,
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
import { Download } from '@carbon/icons-react'
import { useDocumentFiles } from '../api/queries'
import { downloadFile } from '../api/client'
import type { DocumentFile } from '../api/types'

const headers = [
  { key: 'filename', header: 'Filename' },
  { key: 'mimetype', header: 'Type' },
  { key: 'size', header: 'Size' },
  { key: 'timestamp', header: 'Created' },
  { key: 'actions', header: '' },
]

export default function FilesTab({ docId }: { docId: number }) {
  const { data, isLoading } = useDocumentFiles(docId)
  if (isLoading) return <InlineLoading description="Loading files…" />

  const files = data?.results ?? []
  if (files.length === 0) return <Tile>No files.</Tile>

  const byId = new Map<string, DocumentFile>(
    files.map((f) => [String(f.id), f]),
  )
  const rows = files.map((f) => ({
    id: String(f.id),
    filename: f.filename,
    mimetype: f.mimetype,
    size: f.size != null ? `${(f.size / 1024).toFixed(1)} KB` : '—',
    timestamp: f.timestamp ? new Date(f.timestamp).toLocaleString() : '—',
    actions: '',
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
                const file = byId.get(row.id)
                return (
                  <TableRow key={key} {...rest}>
                    {row.cells.map((cell) =>
                      cell.info.header === 'actions' ? (
                        <TableCell key={cell.id}>
                          <Button
                            kind="ghost"
                            size="sm"
                            renderIcon={Download}
                            data-testid={`download-${row.id}`}
                            onClick={() =>
                              file &&
                              downloadFile(
                                `${file.url}download/`,
                                file.filename,
                              )
                            }
                          >
                            Download
                          </Button>
                        </TableCell>
                      ) : (
                        <TableCell key={cell.id}>{cell.value}</TableCell>
                      ),
                    )}
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
