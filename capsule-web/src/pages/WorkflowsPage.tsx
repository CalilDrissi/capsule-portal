import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Button,
  DataTableSkeleton,
  ProgressIndicator,
  ProgressStep,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
  Tile,
} from '@carbon/react'
import { FlowConnection } from '@carbon/icons-react'
import PageBreadcrumb from '../components/PageBreadcrumb'
import {
  useWorkflowStates,
  useWorkflowTemplate,
  useWorkflowTemplates,
  useWorkflowTransitions,
} from '../api/queries'

function WorkflowTemplateDetail({ templateId }: { templateId: number }) {
  const { data: template } = useWorkflowTemplate(templateId)
  const { data: statesData, isLoading: sLoading } =
    useWorkflowStates(templateId)
  const { data: transData, isLoading: tLoading } =
    useWorkflowTransitions(templateId)

  // Order states by completion so the ProgressIndicator reads start → end.
  const states = [...(statesData?.results ?? [])].sort(
    (a, b) => (a.completion ?? 0) - (b.completion ?? 0),
  )
  const transitions = transData?.results ?? []
  const initialIndex = states.findIndex((s) => s.initial)

  return (
    <div className="capsule-page">
      <PageBreadcrumb
        items={[
          { label: 'Flux de travail', to: '/workflows' },
          { label: template?.label ?? 'Flux de travail' },
        ]}
      />
      <h2 className="capsule-page__title">{template?.label ?? 'Flux de travail'}</h2>

      <h4 className="capsule-section-title">États</h4>
      {sLoading ? (
        <DataTableSkeleton columnCount={1} rowCount={3} showHeader={false} />
      ) : states.length === 0 ? (
        <Tile data-testid="wf-states-empty">Aucun état défini.</Tile>
      ) : (
        <div className="capsule-wf-progress" data-testid="wf-states">
          <ProgressIndicator
            currentIndex={initialIndex >= 0 ? initialIndex : 0}
            spaceEqually
          >
            {states.map((s) => (
              <ProgressStep
                key={s.id}
                label={s.label}
                secondaryLabel={`${s.completion ?? 0}%${
                  s.final ? ' · final' : s.initial ? ' · initial' : ''
                }`}
              />
            ))}
          </ProgressIndicator>
        </div>
      )}

      <h4 className="capsule-section-title" style={{ marginTop: '2rem' }}>
        Transitions
      </h4>
      {tLoading ? (
        <DataTableSkeleton columnCount={3} rowCount={3} showHeader={false} />
      ) : transitions.length === 0 ? (
        <Tile data-testid="wf-transitions-empty">Aucune transition définie.</Tile>
      ) : (
        <TableContainer>
          <Table data-testid="wf-transitions-table">
            <TableHead>
              <TableRow>
                <TableHeader>Transition</TableHeader>
                <TableHeader>De</TableHeader>
                <TableHeader>Vers</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {transitions.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>{t.label}</TableCell>
                  <TableCell>
                    <Tag type="cool-gray">{t.origin_state?.label ?? '—'}</Tag>
                  </TableCell>
                  <TableCell>
                    <Tag type="blue">{t.destination_state?.label ?? '—'}</Tag>
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

export default function WorkflowsPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { data, isLoading, isError, error } = useWorkflowTemplates()

  const templateParam = searchParams.get('template')
  if (templateParam) {
    return <WorkflowTemplateDetail templateId={Number(templateParam)} />
  }

  const templates = data?.results ?? []

  return (
    <div className="capsule-page">
      <h2 className="capsule-page__title">Flux de travail</h2>
      {isLoading ? (
        <DataTableSkeleton columnCount={3} rowCount={4} showHeader={false} />
      ) : isError ? (
        <Tile>Échec du chargement des flux de travail : {(error as Error)?.message}</Tile>
      ) : templates.length === 0 ? (
        <Tile className="capsule-empty" data-testid="workflows-empty">
          <h4>Aucun modèle de flux de travail</h4>
          <p>Les modèles de flux de travail sont définis côté serveur.</p>
        </Tile>
      ) : (
        <TableContainer>
          <Table data-testid="workflows-table">
            <TableHead>
              <TableRow>
                <TableHeader>Flux de travail</TableHeader>
                <TableHeader>Nom interne</TableHeader>
                <TableHeader>Lancement automatique</TableHeader>
                <TableHeader> </TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {templates.map((wt) => (
                <TableRow
                  key={wt.id}
                  data-testid={`workflow-row-${wt.id}`}
                  onClick={() => navigate(`/workflows?template=${wt.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <TableCell>
                    <FlowConnection
                      size={16}
                      style={{ verticalAlign: 'middle', marginRight: 8 }}
                    />
                    {wt.label}
                  </TableCell>
                  <TableCell>{wt.internal_name}</TableCell>
                  <TableCell>{wt.auto_launch ? 'Oui' : 'Non'}</TableCell>
                  <TableCell>
                    <Button kind="ghost" size="sm">
                      Afficher
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
