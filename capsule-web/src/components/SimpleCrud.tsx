import { useState } from 'react'
import {
  Button,
  Checkbox,
  DataTable,
  DataTableSkeleton,
  Modal,
  OverflowMenu,
  OverflowMenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  TextInput,
  Tile,
} from '@carbon/react'
import { Add } from '@carbon/icons-react'
import { requiredLabel } from '../lib/forms'

export interface CrudField {
  name: string
  label: string
  type?: 'text' | 'toggle'
  required?: boolean
}
export interface CrudColumn<T> {
  key: string
  header: string
  render: (item: T) => React.ReactNode
}

interface Props<T extends { id: number }> {
  title: string
  items: T[]
  isLoading: boolean
  isError?: boolean
  columns: CrudColumn<T>[]
  fields: CrudField[]
  toInitial: (item: T | null) => Record<string, string | boolean>
  onCreate: (values: Record<string, string | boolean>) => void
  onUpdate: (id: number, values: Record<string, string | boolean>) => void
  onDelete: (id: number) => void
  busy?: boolean
  extraRowActions?: (item: T) => React.ReactNode
}

export default function SimpleCrud<T extends { id: number }>({
  title,
  items,
  isLoading,
  isError,
  columns,
  fields,
  toInitial,
  onCreate,
  onUpdate,
  onDelete,
  busy,
  extraRowActions,
}: Props<T>) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<T | null>(null)
  const [values, setValues] = useState<Record<string, string | boolean>>({})
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [attempted, setAttempted] = useState(false)

  function isFieldInvalid(f: CrudField): boolean {
    return (
      attempted &&
      !!f.required &&
      f.type !== 'toggle' &&
      !String(values[f.name] ?? '').trim()
    )
  }

  function openCreate() {
    setEditing(null)
    setValues(toInitial(null))
    setAttempted(false)
    setOpen(true)
  }
  function openEdit(item: T) {
    setEditing(item)
    setValues(toInitial(item))
    setAttempted(false)
    setOpen(true)
  }
  function closeModal() {
    setAttempted(false)
    setOpen(false)
  }
  function submit() {
    setAttempted(true)
    const hasInvalid = fields.some(
      (f) =>
        f.required &&
        f.type !== 'toggle' &&
        !String(values[f.name] ?? '').trim(),
    )
    if (hasInvalid) return
    if (editing) onUpdate(editing.id, values)
    else onCreate(values)
    setAttempted(false)
    setOpen(false)
  }

  const headers = [...columns.map((c) => ({ key: c.key, header: c.header })), { key: '__a', header: '' }]

  return (
    <div className="capsule-page">
      <div className="capsule-page__header">
        <h2 className="capsule-page__title">{title}</h2>
        <Button renderIcon={Add} onClick={openCreate}>
          New
        </Button>
      </div>

      {isLoading ? (
        <DataTableSkeleton columnCount={columns.length + 1} rowCount={6} showHeader={false} />
      ) : isError ? (
        <Tile>Failed to load.</Tile>
      ) : items.length === 0 ? (
        <Tile>Nothing here yet.</Tile>
      ) : (
        <DataTable rows={items.map((i) => ({ id: String(i.id) }))} headers={headers}>
          {({ getTableProps, getHeaderProps }) => (
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
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      {columns.map((c) => (
                        <TableCell key={c.key}>{c.render(item)}</TableCell>
                      ))}
                      <TableCell>
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                          {extraRowActions?.(item)}
                          <OverflowMenu aria-label="Actions" flipped>
                            <OverflowMenuItem itemText="Edit" onClick={() => openEdit(item)} />
                            <OverflowMenuItem
                              isDelete
                              itemText="Delete"
                              onClick={() => setDeleteId(item.id)}
                            />
                          </OverflowMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DataTable>
      )}

      {open && (
        <Modal
          open={open}
          modalHeading={editing ? `Edit ${title}` : `New ${title}`}
          primaryButtonText={busy ? 'Saving…' : 'Save'}
          secondaryButtonText="Cancel"
          primaryButtonDisabled={busy}
          onRequestClose={closeModal}
          onRequestSubmit={submit}
        >
          <Stack gap={5}>
            {fields.map((f) =>
              f.type === 'toggle' ? (
                <Checkbox
                  key={f.name}
                  id={`f-${f.name}`}
                  labelText={f.label}
                  checked={!!values[f.name]}
                  onChange={(_e, { checked }) =>
                    setValues((v) => ({ ...v, [f.name]: checked }))
                  }
                />
              ) : (
                <TextInput
                  key={f.name}
                  id={`f-${f.name}`}
                  labelText={f.required ? requiredLabel(f.label) : f.label}
                  value={(values[f.name] as string) ?? ''}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [f.name]: e.target.value }))
                  }
                  invalid={isFieldInvalid(f)}
                  invalidText={`${f.label} is required.`}
                />
              ),
            )}
          </Stack>
        </Modal>
      )}

      {deleteId != null && (
        <Modal
          open
          danger
          size="sm"
          modalHeading={`Delete this ${title.replace(/s$/, '').toLowerCase()}?`}
          primaryButtonText="Delete"
          secondaryButtonText="Cancel"
          onRequestClose={() => setDeleteId(null)}
          onRequestSubmit={() => {
            onDelete(deleteId)
            setDeleteId(null)
          }}
        >
          <p>This action cannot be undone.</p>
        </Modal>
      )}
    </div>
  )
}
