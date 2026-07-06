import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Button,
  DataTableSkeleton,
  Search,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  TextInput,
  Tile,
} from '@carbon/react'
import { Search as SearchIcon } from '@carbon/icons-react'
import {
  useSavedResultsets,
  useSearch,
} from '../api/queries'
import DocumentsTable from '../components/DocumentsTable'

/** Pragmatic advanced-search fields mapped to documentsearchresult fields. */
const ADVANCED_FIELDS: { key: string; label: string }[] = [
  { key: 'label', label: 'Libellé' },
  { key: 'description', label: 'Description' },
  { key: 'document_type__label', label: 'Type de document' },
  { key: 'metadata__value', label: 'Valeur de métadonnée' },
  { key: 'files__file_pages__content__content', label: 'Contenu du fichier' },
]

function SimpleSearch() {
  const [searchParams, setSearchParams] = useSearchParams()
  const q = searchParams.get('q') ?? ''
  const [term, setTerm] = useState(q)

  const params = q ? `q=${encodeURIComponent(q)}` : null
  const { data, isLoading, isError, error, isFetching } = useSearch(params)

  function submit() {
    const next = new URLSearchParams(searchParams)
    if (term.trim()) next.set('q', term.trim())
    else next.delete('q')
    setSearchParams(next)
  }

  const results = data?.results ?? []

  return (
    <Stack gap={5}>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}>
          <Search
            id="simple-search"
            data-testid="search-input"
            labelText="Rechercher des documents"
            placeholder="Rechercher des documents…"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit()
            }}
          />
        </div>
        <Button renderIcon={SearchIcon} onClick={submit} data-testid="search-submit">
          Rechercher
        </Button>
      </div>

      {!q ? (
        <Tile className="capsule-empty">
          <p>Saisissez un terme pour rechercher des documents.</p>
        </Tile>
      ) : isLoading || isFetching ? (
        <DataTableSkeleton columnCount={3} rowCount={5} showHeader={false} />
      ) : isError ? (
        <Tile>Échec de la recherche : {(error as Error)?.message}</Tile>
      ) : results.length === 0 ? (
        <Tile className="capsule-empty" data-testid="search-empty">
          <p>Aucun document ne correspond à « {q} ».</p>
        </Tile>
      ) : (
        <div data-testid="search-results">
          <p style={{ marginBottom: '0.5rem' }}>
            {data?.count ?? results.length} résultat(s)
          </p>
          <DocumentsTable documents={results} />
        </div>
      )}
    </Stack>
  )
}

function AdvancedSearch() {
  const [values, setValues] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState<string | null>(null)

  const { data, isLoading, isError, error } = useSearch(submitted, true)
  const results = data?.results ?? []

  function submit() {
    const parts = ADVANCED_FIELDS.filter((f) => values[f.key]?.trim()).map(
      (f) => `${f.key}=${encodeURIComponent(values[f.key].trim())}`,
    )
    setSubmitted(parts.length ? parts.join('&') : null)
  }

  return (
    <Stack gap={5}>
      <Stack gap={4}>
        {ADVANCED_FIELDS.map((f) => (
          <TextInput
            key={f.key}
            id={`adv-${f.key}`}
            data-testid={`adv-${f.key}`}
            labelText={f.label}
            value={values[f.key] ?? ''}
            onChange={(e) =>
              setValues((v) => ({ ...v, [f.key]: e.target.value }))
            }
          />
        ))}
        <div>
          <Button
            renderIcon={SearchIcon}
            onClick={submit}
            data-testid="adv-search-submit"
          >
            Recherche avancée
          </Button>
        </div>
      </Stack>

      {!submitted ? (
        <Tile className="capsule-empty">
          <p>Renseignez un ou plusieurs champs et lancez une recherche avancée.</p>
        </Tile>
      ) : isLoading ? (
        <DataTableSkeleton columnCount={3} rowCount={5} showHeader={false} />
      ) : isError ? (
        <Tile>Échec de la recherche : {(error as Error)?.message}</Tile>
      ) : results.length === 0 ? (
        <Tile className="capsule-empty">
          <p>Aucun document ne correspond aux critères.</p>
        </Tile>
      ) : (
        <div data-testid="adv-search-results">
          <p style={{ marginBottom: '0.5rem' }}>
            {data?.count ?? results.length} résultat(s)
          </p>
          <DocumentsTable documents={results} />
        </div>
      )}
    </Stack>
  )
}

function SavedSearches() {
  const { data, isLoading, isError, error } = useSavedResultsets()
  const items = useMemo(() => data?.results ?? [], [data])

  if (isLoading)
    return <DataTableSkeleton columnCount={2} rowCount={3} showHeader={false} />
  if (isError)
    return <Tile>Échec du chargement des recherches enregistrées : {(error as Error)?.message}</Tile>

  if (items.length === 0)
    return (
      <Tile className="capsule-empty">
        <h4>Aucune recherche enregistrée</h4>
        <p>
          L'API Mayan expose les ensembles de résultats enregistrés en lecture seule (aucune action de création sur{' '}
          <code>/saved_resultsets/</code>) ; aucun n'existe pour l'instant.
        </p>
      </Tile>
    )

  return (
    <Stack gap={3} data-testid="saved-list">
      {items.map((s) => (
        <Tile key={s.id}>
          <strong>Ensemble de résultats enregistré n° {s.id}</strong>
          {s.search_model_pk ? <p>Modèle : {s.search_model_pk}</p> : null}
          {s.datetime_created ? (
            <p>Créé le : {new Date(s.datetime_created).toLocaleString('fr-FR')}</p>
          ) : null}
        </Tile>
      ))}
    </Stack>
  )
}

export default function SearchPage() {
  return (
    <div className="capsule-page">
      <h2 className="capsule-page__title">Recherche</h2>
      <Tabs>
        <TabList aria-label="Modes de recherche" contained>
          <Tab>Simple</Tab>
          <Tab>Avancée</Tab>
          <Tab>Enregistrées</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <SimpleSearch />
          </TabPanel>
          <TabPanel>
            <AdvancedSearch />
          </TabPanel>
          <TabPanel>
            <SavedSearches />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  )
}
