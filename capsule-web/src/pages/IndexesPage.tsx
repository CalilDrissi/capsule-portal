import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Button,
  DataTableSkeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tile,
  TreeNode,
  TreeView,
} from '@carbon/react'
import { Catalog, Folder } from '@carbon/icons-react'
import PageBreadcrumb from '../components/PageBreadcrumb'
import {
  useIndexInstance,
  useIndexInstances,
  useIndexNodeDocuments,
  useIndexNodes,
} from '../api/queries'
import type { DocumentSummary, IndexInstanceNode } from '../api/types'

/** A single index node; lazily loads and renders its children when expanded. */
function IndexNode({
  node,
  onSelectLeaf,
}: {
  node: IndexInstanceNode
  onSelectLeaf: (node: IndexInstanceNode) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const isLeaf = node.node_count === 0
  const { data } = useIndexNodes(expanded && !isLeaf ? node.children_url : null)
  const children = data?.results ?? []

  return (
    <TreeNode
      id={`node-${node.id}`}
      label={`${node.value || '(blank)'}${isLeaf ? '' : ` (${node.node_count})`}`}
      renderIcon={Folder}
      isExpanded={expanded}
      onToggle={(_e: unknown, value: { isExpanded?: boolean }) =>
        setExpanded(!!value.isExpanded)
      }
      onSelect={() => isLeaf && onSelectLeaf(node)}
    >
      {!isLeaf
        ? children.map((c) => (
            <IndexNode key={c.id} node={c} onSelectLeaf={onSelectLeaf} />
          ))
        : undefined}
    </TreeNode>
  )
}

function NodeDocuments({ node }: { node: IndexInstanceNode }) {
  const navigate = useNavigate()
  const { data, isLoading } = useIndexNodeDocuments(node.documents_url)
  const docs: DocumentSummary[] = data?.results ?? []

  if (isLoading)
    return <DataTableSkeleton columnCount={2} rowCount={3} showHeader={false} />
  if (docs.length === 0)
    return (
      <Tile className="capsule-empty">
        <p>No documents at "{node.value}".</p>
      </Tile>
    )

  return (
    <TableContainer title={`Documents in "${node.value}"`}>
      <Table data-testid="index-node-docs">
        <TableHead>
          <TableRow>
            <TableHeader>Label</TableHeader>
            <TableHeader>Type</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {docs.map((d) => (
            <TableRow
              key={d.id}
              onClick={() => navigate(`/documents/${d.id}`)}
              style={{ cursor: 'pointer' }}
            >
              <TableCell>{d.label}</TableCell>
              <TableCell>{d.document_type?.label ?? '—'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

function IndexInstanceBrowser({ instanceId }: { instanceId: number }) {
  const { data: instance } = useIndexInstance(instanceId)
  const { data, isLoading } = useIndexNodes(instance?.nodes_url)
  const [leaf, setLeaf] = useState<IndexInstanceNode | null>(null)

  const topNodes = data?.results ?? []

  return (
    <div className="capsule-page">
      <PageBreadcrumb
        items={[
          { label: 'Indexes', to: '/indexes' },
          { label: instance?.label ?? 'Index' },
        ]}
      />
      <h2 className="capsule-page__title">
        {instance?.label ?? 'Index'}
      </h2>

      <div className="capsule-detail capsule-detail--browse">
        <div className="capsule-meta" data-testid="index-tree">
          {isLoading ? (
            <DataTableSkeleton columnCount={1} rowCount={5} showHeader={false} />
          ) : topNodes.length === 0 ? (
            <Tile className="capsule-empty">
              <p>This index has no nodes.</p>
            </Tile>
          ) : (
            <TreeView label="Index node tree" hideLabel>
              {topNodes.map((n) => (
                <IndexNode key={n.id} node={n} onSelectLeaf={setLeaf} />
              ))}
            </TreeView>
          )}
        </div>
        <div style={{ flex: 1 }}>
          {leaf ? (
            <NodeDocuments node={leaf} />
          ) : (
            <Tile className="capsule-empty">
              <p>Select a leaf node to view its documents.</p>
            </Tile>
          )}
        </div>
      </div>
    </div>
  )
}

export default function IndexesPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { data, isLoading, isError, error } = useIndexInstances()

  const instanceParam = searchParams.get('instance')
  if (instanceParam) {
    return <IndexInstanceBrowser instanceId={Number(instanceParam)} />
  }

  const instances = data?.results ?? []

  return (
    <div className="capsule-page">
      <h2 className="capsule-page__title">Indexes</h2>
      {isLoading ? (
        <DataTableSkeleton columnCount={3} rowCount={4} showHeader={false} />
      ) : isError ? (
        <Tile>Failed to load indexes: {(error as Error)?.message}</Tile>
      ) : instances.length === 0 ? (
        <Tile className="capsule-empty">
          <h4>No index instances</h4>
          <p>Indexes are built server-side from index templates.</p>
        </Tile>
      ) : (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Index</TableHeader>
                <TableHeader>Top-level nodes</TableHeader>
                <TableHeader> </TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {instances.map((inst) => (
                <TableRow
                  key={inst.id}
                  onClick={() => navigate(`/indexes?instance=${inst.id}`)}
                  style={{ cursor: 'pointer' }}
                  data-testid={`index-row-${inst.id}`}
                >
                  <TableCell>
                    <Catalog
                      size={16}
                      style={{ verticalAlign: 'middle', marginRight: 8 }}
                    />
                    {inst.label}
                  </TableCell>
                  <TableCell>{inst.node_count}</TableCell>
                  <TableCell>
                    <Button kind="ghost" size="sm">
                      Browse
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </div>
  )
}
