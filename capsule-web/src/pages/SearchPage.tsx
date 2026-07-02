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
  { key: 'label', label: 'Label' },
  { key: 'description', label: 'Description' },
  { key: 'document_type__label', label: 'Document type' },
  { key: 'metadata__value', label: 'Metadata value' },
  { key: 'files__file_pages__content__content', label: 'File content' },
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
            labelText="Search documents"
            placeholder="Search documents…"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit()
            }}
          />
        </div>
        <Button renderIcon={SearchIcon} onClick={submit} data-testid="search-submit">
          Search
        </Button>
      </div>

      {!q ? (
        <Tile className="capsule-empty">
          <p>Enter a term to search documents.</p>
        </Tile>
      ) : isLoading || isFetching ? (
        <DataTableSkeleton columnCount={3} rowCount={5} showHeader={false} />
      ) : isError ? (
        <Tile>Search failed: {(error as Error)?.message}</Tile>
      ) : results.length === 0 ? (
        <Tile className="capsule-empty" data-testid="search-empty">
          <p>No documents matched "{q}".</p>
        </Tile>
      ) : (
        <div data-testid="search-results">
          <p style={{ marginBottom: '0.5rem' }}>
            {data?.count ?? results.length} result(s)
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
            Advanced search
          </Button>
        </div>
      </Stack>

      {!submitted ? (
        <Tile className="capsule-empty">
          <p>Fill one or more fields and run an advanced search.</p>
        </Tile>
      ) : isLoading ? (
        <DataTableSkeleton columnCount={3} rowCount={5} showHeader={false} />
      ) : isError ? (
        <Tile>Search failed: {(error as Error)?.message}</Tile>
      ) : results.length === 0 ? (
        <Tile className="capsule-empty">
          <p>No documents matched the criteria.</p>
        </Tile>
      ) : (
        <div data-testid="adv-search-results">
          <p style={{ marginBottom: '0.5rem' }}>
            {data?.count ?? results.length} result(s)
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
    return <Tile>Failed to load saved searches: {(error as Error)?.message}</Tile>

  if (items.length === 0)
    return (
      <Tile className="capsule-empty">
        <h4>No saved searches</h4>
        <p>
          The Mayan API exposes saved resultsets read-only (no create action on{' '}
          <code>/saved_resultsets/</code>); none exist yet.
        </p>
      </Tile>
    )

  return (
    <Stack gap={3} data-testid="saved-list">
      {items.map((s) => (
        <Tile key={s.id}>
          <strong>Saved resultset #{s.id}</strong>
          {s.search_model_pk ? <p>Model: {s.search_model_pk}</p> : null}
          {s.datetime_created ? (
            <p>Created: {new Date(s.datetime_created).toLocaleString()}</p>
          ) : null}
        </Tile>
      ))}
    </Stack>
  )
}

export default function SearchPage() {
  return (
    <div className="capsule-page">
      <h2 className="capsule-page__title">Search</h2>
      <Tabs>
        <TabList aria-label="Search modes" contained>
          <Tab>Simple</Tab>
          <Tab>Advanced</Tab>
          <Tab>Saved</Tab>
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
