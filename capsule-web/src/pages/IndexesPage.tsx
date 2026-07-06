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
      label={`${node.value || '(vide)'}${isLeaf ? '' : ` (${node.node_count})`}`}
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
        <p>Aucun document dans « {node.value} ».</p>
      </Tile>
    )

  return (
    <TableContainer title={`Documents dans « ${node.value} »`}>
      <Table data-testid="index-node-docs">
        <TableHead>
          <TableRow>
            <TableHeader>Libellé</TableHeader>
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
          { label: 'Index', to: '/indexes' },
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
              <p>Cet index ne comporte aucun nœud.</p>
            </Tile>
          ) : (
            <TreeView label="Arborescence des nœuds d'index" hideLabel>
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
              <p>Sélectionnez un nœud terminal pour afficher ses documents.</p>
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
      <h2 className="capsule-page__title">Index</h2>
      {isLoading ? (
        <DataTableSkeleton columnCount={3} rowCount={4} showHeader={false} />
      ) : isError ? (
        <Tile>Échec du chargement des index : {(error as Error)?.message}</Tile>
      ) : instances.length === 0 ? (
        <Tile className="capsule-empty">
          <h4>Aucune instance d'index</h4>
          <p>Les index sont générés côté serveur à partir de modèles d'index.</p>
        </Tile>
      ) : (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Index</TableHeader>
                <TableHeader>Nœuds de premier niveau</TableHeader>
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
                      Parcourir
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
