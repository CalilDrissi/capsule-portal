import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { apiDelete, apiGet, apiPatch, apiPost, changePassword } from './client'
import type {
  CapsuleClient,
  CapsuleDocumentRequest,
  CapsuleNotification,
  CapsuleNotificationList,
  FirmSettings,
  ProvisionClientResult,
  Whoami,
} from './types'
import { useAppStore } from '../store/useAppStore'
import type {
  AccessControlList,
  Cabinet,
  Checkout,
  DocumentComment,
  DocumentDetail,
  DocumentMetadata,
  DocumentFile,
  DocumentPage,
  DocumentSignature,
  DocumentSummary,
  DocumentType,
  DocumentTypeMetadataType,
  DocumentVersion,
  FavoriteDocument,
  Group,
  IndexInstance,
  IndexInstanceNode,
  PageContent,
  Paginated,
  Permission,
  Role,
  SavedResultset,
  SearchModel,
  Source,
  Tag,
  TrashedDocument,
  User,
  WorkflowInstance,
  WorkflowLogEntry,
  WorkflowState,
  WorkflowTemplate,
  WorkflowTransition,
} from './types'

import { ApiError } from './client'

export const documentsKey = (page: number, pageSize: number) =>
  ['documents', page, pageSize] as const

export function useDocuments(page: number, pageSize: number) {
  return useQuery({
    queryKey: documentsKey(page, pageSize),
    queryFn: () =>
      apiGet<Paginated<DocumentSummary>>(
        `/documents/?page=${page}&page_size=${pageSize}`,
      ),
    placeholderData: (prev) => prev,
  })
}

export function useDocument(id: number | null) {
  return useQuery({
    queryKey: ['document', id] as const,
    queryFn: () => apiGet<DocumentDetail>(`/documents/${id}/`),
    enabled: id != null,
  })
}

export function useDocumentTypes() {
  return useQuery({
    queryKey: ['document_types'] as const,
    queryFn: () =>
      apiGet<Paginated<DocumentType>>(`/document_types/?page_size=100`),
  })
}

/** Sources that can accept interactive uploads (web form backend). */
export function useUploadSources() {
  return useQuery({
    queryKey: ['sources', 'upload'] as const,
    queryFn: async () => {
      const data = await apiGet<Paginated<Source>>(`/sources/?page_size=100`)
      return data.results.filter(
        (s) => s.enabled && /webform/i.test(s.backend_path),
      )
    },
  })
}

/** Pages of the active version of a document (for the viewer). */
export function useDocumentPages(pageListUrl: string | null | undefined) {
  return useQuery({
    queryKey: ['document_pages', pageListUrl] as const,
    queryFn: () => apiGet<Paginated<DocumentPage>>(pageListUrl as string),
    enabled: !!pageListUrl,
  })
}

/* ----------------------------- Metadata ----------------------------- */

export function useDocumentMetadata(id: number | null) {
  return useQuery({
    queryKey: ['document_metadata', id] as const,
    queryFn: () =>
      apiGet<Paginated<DocumentMetadata>>(
        `/documents/${id}/metadata/?page_size=100`,
      ),
    enabled: id != null,
  })
}

/** Metadata types made available on a document type. */
export function useDocumentTypeMetadataTypes(typeId: number | null | undefined) {
  return useQuery({
    queryKey: ['doctype_metadata_types', typeId] as const,
    queryFn: () =>
      apiGet<Paginated<DocumentTypeMetadataType>>(
        `/document_types/${typeId}/metadata_types/?page_size=100`,
      ),
    enabled: typeId != null,
  })
}

export function useAddMetadata(docId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { metadata_type_id: number; value: string }) =>
      apiPost(`/documents/${docId}/metadata/`, vars),
    meta: { successMessage: 'Metadata added' },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['document_metadata', docId] }),
  })
}

export function useUpdateMetadata(docId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { metadataId: number; value: string }) =>
      apiPatch(`/documents/${docId}/metadata/${vars.metadataId}/`, {
        value: vars.value,
      }),
    meta: { successMessage: 'Metadata updated' },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['document_metadata', docId] }),
  })
}

export function useDeleteMetadata(docId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (metadataId: number) =>
      apiDelete(`/documents/${docId}/metadata/${metadataId}/`),
    meta: { successMessage: 'Metadata removed' },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['document_metadata', docId] }),
  })
}

/* ------------------------------- Tags ------------------------------- */

export function useDocumentTags(id: number | null) {
  return useQuery({
    queryKey: ['document_tags', id] as const,
    queryFn: () =>
      apiGet<Paginated<Tag>>(`/documents/${id}/tags/?page_size=100`),
    enabled: id != null,
  })
}

export function useAllTags() {
  return useQuery({
    queryKey: ['tags'] as const,
    queryFn: () => apiGet<Paginated<Tag>>(`/tags/?page_size=100`),
  })
}

export function useAttachTag(docId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (tagId: number) =>
      apiPost(`/documents/${docId}/tags/attach/`, { tag: tagId }),
    meta: { successMessage: 'Tag added' },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['document_tags', docId] }),
  })
}

export function useRemoveTag(docId: number) {
  const qc = useQueryClient()
  const key = ['document_tags', docId] as const
  return useMutation({
    mutationFn: (tagId: number) =>
      apiPost(`/documents/${docId}/tags/remove/`, { tag: tagId }),
    meta: { successMessage: 'Tag removed' },
    // Optimistically drop the tag so the UI is correct regardless of the
    // backend's read-after-write visibility lag on the document<->tag M2M.
    onMutate: async (tagId: number) => {
      await qc.cancelQueries({ queryKey: key })
      const prev = qc.getQueryData<Paginated<Tag>>(key)
      if (prev) {
        qc.setQueryData<Paginated<Tag>>(key, {
          ...prev,
          count: Math.max(0, prev.count - 1),
          results: prev.results.filter((t) => t.id !== tagId),
        })
      }
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  })
}

/* ----------------------------- Comments ----------------------------- */

export function useDocumentComments(id: number | null) {
  return useQuery({
    queryKey: ['document_comments', id] as const,
    queryFn: () =>
      apiGet<Paginated<DocumentComment>>(
        `/documents/${id}/comments/?page_size=100`,
      ),
    enabled: id != null,
  })
}

export function useAddComment(docId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (text: string) =>
      apiPost(`/documents/${docId}/comments/`, { text }),
    meta: { successMessage: 'Comment added' },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['document_comments', docId] }),
  })
}

/* ------------------------- Versions / Files ------------------------- */

export function useDocumentVersions(id: number | null) {
  return useQuery({
    queryKey: ['document_versions', id] as const,
    queryFn: () =>
      apiGet<Paginated<DocumentVersion>>(
        `/documents/${id}/versions/?page_size=100`,
      ),
    enabled: id != null,
  })
}

export function useDocumentFiles(id: number | null) {
  return useQuery({
    queryKey: ['document_files', id] as const,
    queryFn: () =>
      apiGet<Paginated<DocumentFile>>(
        `/documents/${id}/files/?page_size=100`,
      ),
    enabled: id != null,
  })
}

/* ----------------------------- Favorites ---------------------------- */

export function useFavorites() {
  return useQuery({
    queryKey: ['favorites'] as const,
    queryFn: () =>
      apiGet<Paginated<FavoriteDocument>>(
        `/documents/favorites/?page_size=100`,
      ),
  })
}

export function useToggleFavorite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (vars: {
      docId: number
      favoriteId: number | null
    }) => {
      if (vars.favoriteId != null) {
        await apiDelete(`/documents/favorites/${vars.favoriteId}/`)
      } else {
        await apiPost(`/documents/favorites/`, { document_id: vars.docId })
      }
    },
    meta: { successMessage: 'Favorites updated' },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['favorites'] }),
  })
}

/* ------------------------------- Trash ------------------------------ */

export function useTrashedDocuments() {
  return useQuery({
    queryKey: ['trashed_documents'] as const,
    queryFn: () =>
      apiGet<Paginated<TrashedDocument>>(
        `/trashed_documents/?page_size=100`,
      ),
  })
}

/** Move a live document to the trash. */
export function useTrashDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (docId: number) => apiDelete(`/documents/${docId}/`),
    meta: { successMessage: 'Document moved to trash' },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents'] })
      qc.invalidateQueries({ queryKey: ['trashed_documents'] })
      qc.invalidateQueries({ queryKey: ['favorites'] })
    },
  })
}

export function useRestoreDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (docId: number) =>
      apiPost(`/trashed_documents/${docId}/restore/`),
    meta: { successMessage: 'Document restored' },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents'] })
      qc.invalidateQueries({ queryKey: ['trashed_documents'] })
    },
  })
}

/** Permanently delete a trashed document. */
export function useDeleteTrashed() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (docId: number) =>
      apiDelete(`/trashed_documents/${docId}/`),
    meta: { successMessage: 'Document permanently deleted' },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['trashed_documents'] }),
  })
}

/* ------------------------------ Cabinets ----------------------------- */

/** All cabinets (the API returns the full tree; each node carries children). */
export function useCabinets() {
  return useQuery({
    queryKey: ['cabinets'] as const,
    queryFn: () => apiGet<Paginated<Cabinet>>(`/cabinets/?page_size=100`),
  })
}

export function useCabinet(id: number | null) {
  return useQuery({
    queryKey: ['cabinet', id] as const,
    queryFn: () => apiGet<Cabinet>(`/cabinets/${id}/`),
    enabled: id != null,
  })
}

/** Documents filed in a cabinet. */
export function useCabinetDocuments(id: number | null) {
  return useQuery({
    queryKey: ['cabinet_documents', id] as const,
    queryFn: () =>
      apiGet<Paginated<DocumentSummary>>(
        `/cabinets/${id}/documents/?page_size=100`,
      ),
    enabled: id != null,
  })
}

/** Cabinets that a given document is filed in (for the document detail page). */
export function useDocumentCabinets(docId: number | null) {
  return useQuery({
    queryKey: ['document_cabinets', docId] as const,
    queryFn: () =>
      apiGet<Paginated<Cabinet>>(`/documents/${docId}/cabinets/?page_size=100`),
    enabled: docId != null,
  })
}

export function useCreateCabinet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { label: string; parent: number | null }) =>
      apiPost<Cabinet>(`/cabinets/`, vars),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cabinets'] }),
  })
}

export function useUpdateCabinet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { id: number; label: string }) =>
      apiPatch<Cabinet>(`/cabinets/${vars.id}/`, { label: vars.label }),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['cabinets'] })
      qc.invalidateQueries({ queryKey: ['cabinet', vars.id] })
    },
  })
}

export function useDeleteCabinet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiDelete(`/cabinets/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cabinets'] }),
  })
}

/** Add a document to a cabinet. POST {document: id} to .../documents/add/. */
export function useAddDocumentToCabinet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { cabinetId: number; documentId: number }) =>
      apiPost(`/cabinets/${vars.cabinetId}/documents/add/`, {
        document: vars.documentId,
      }),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['cabinet_documents', vars.cabinetId] })
      qc.invalidateQueries({
        queryKey: ['document_cabinets', vars.documentId],
      })
    },
  })
}

/** Remove a document from a cabinet. POST {document: id} to .../documents/remove/. */
export function useRemoveDocumentFromCabinet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { cabinetId: number; documentId: number }) =>
      apiPost(`/cabinets/${vars.cabinetId}/documents/remove/`, {
        document: vars.documentId,
      }),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['cabinet_documents', vars.cabinetId] })
      qc.invalidateQueries({
        queryKey: ['document_cabinets', vars.documentId],
      })
    },
  })
}

/* ------------------------------ Indexes ------------------------------ */

export function useIndexInstances() {
  return useQuery({
    queryKey: ['index_instances'] as const,
    queryFn: () =>
      apiGet<Paginated<IndexInstance>>(`/index_instances/?page_size=100`),
  })
}

export function useIndexInstance(id: number | null) {
  return useQuery({
    queryKey: ['index_instance', id] as const,
    queryFn: () => apiGet<IndexInstance>(`/index_instances/${id}/`),
    enabled: id != null,
  })
}

/**
 * Children of an index node. With `nodesUrl` omitted we fetch the instance's
 * top-level nodes; otherwise we follow the node's `children_url`.
 */
export function useIndexNodes(nodesUrl: string | null | undefined) {
  return useQuery({
    queryKey: ['index_nodes', nodesUrl] as const,
    queryFn: () =>
      apiGet<Paginated<IndexInstanceNode>>(
        `${nodesUrl}${nodesUrl?.includes('?') ? '&' : '?'}page_size=100`,
      ),
    enabled: !!nodesUrl,
  })
}

/** Documents filed at an index leaf node. */
export function useIndexNodeDocuments(documentsUrl: string | null | undefined) {
  return useQuery({
    queryKey: ['index_node_documents', documentsUrl] as const,
    queryFn: () =>
      apiGet<Paginated<DocumentSummary>>(
        `${documentsUrl}${documentsUrl?.includes('?') ? '&' : '?'}page_size=100`,
      ),
    enabled: !!documentsUrl,
  })
}

/* ------------------------------- Search ------------------------------ */

export const DOCUMENT_SEARCH_MODEL = 'documents.documentsearchresult'

export function useSearchModels() {
  return useQuery({
    queryKey: ['search_models'] as const,
    queryFn: () =>
      apiGet<Paginated<SearchModel>>(`/search_models/?page_size=100`),
  })
}

/**
 * Run a search. `params` is a query string (already URL-encoded) such as
 * `q=foo` (simple) or `label=foo&description=bar` (advanced). `advanced`
 * switches to the /search/advanced/{pk}/ endpoint.
 */
export function useSearch(
  params: string | null,
  advanced = false,
  modelPk: string = DOCUMENT_SEARCH_MODEL,
) {
  return useQuery({
    queryKey: ['search', modelPk, advanced, params] as const,
    queryFn: () =>
      apiGet<Paginated<DocumentSummary>>(
        `/search/${advanced ? 'advanced/' : ''}${modelPk}/?${params}`,
      ),
    enabled: !!params,
  })
}

export function useSavedResultsets() {
  return useQuery({
    queryKey: ['saved_resultsets'] as const,
    queryFn: () =>
      apiGet<Paginated<SavedResultset>>(`/saved_resultsets/?page_size=100`),
  })
}

/* ------------------------------- Content ----------------------------- */

/**
 * Per-page OCR text for the active document version. Mayan exposes the OCR
 * content at /documents/{id}/versions/{vid}/pages/{pid}/ocr/ → {content}.
 */
export function usePageOcr(
  docId: number | null,
  versionId: number | null | undefined,
  pageId: number | null | undefined,
) {
  return useQuery({
    queryKey: ['page_ocr', docId, versionId, pageId] as const,
    queryFn: () =>
      apiGet<PageContent>(
        `/documents/${docId}/versions/${versionId}/pages/${pageId}/ocr/`,
      ),
    enabled: docId != null && versionId != null && pageId != null,
  })
}

/**
 * Per-page parsed file content. Exposed at
 * /documents/{id}/files/{fid}/pages/{pid}/content/ → {content}.
 */
export function usePageParsedContent(
  docId: number | null,
  fileId: number | null | undefined,
  pageId: number | null | undefined,
) {
  return useQuery({
    queryKey: ['page_parsed', docId, fileId, pageId] as const,
    queryFn: () =>
      apiGet<PageContent>(
        `/documents/${docId}/files/${fileId}/pages/${pageId}/content/`,
      ),
    enabled: docId != null && fileId != null && pageId != null,
  })
}

/* ------------------------------ Checkouts ---------------------------- */

/**
 * Checkout state for a single document. The API 404s when the document is not
 * checked out; we surface that as `null` rather than an error.
 */
export function useDocumentCheckout(id: number | null) {
  return useQuery({
    queryKey: ['document_checkout', id] as const,
    queryFn: async () => {
      try {
        return await apiGet<Checkout>(`/documents/${id}/checkout/`)
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) return null
        throw e
      }
    },
    enabled: id != null,
    retry: false,
  })
}

/** All currently checked-out documents. */
export function useCheckouts() {
  return useQuery({
    queryKey: ['checkouts'] as const,
    queryFn: () => apiGet<Paginated<Checkout>>(`/checkouts/?page_size=100`),
  })
}

export function useCheckoutDocument(docId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { expiration_datetime: string; block_new_file: boolean }) =>
      apiPost(`/checkouts/`, {
        document_pk: docId,
        expiration_datetime: vars.expiration_datetime,
        block_new_file: vars.block_new_file,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['document_checkout', docId] })
      qc.invalidateQueries({ queryKey: ['checkouts'] })
    },
  })
}

export function useCheckinDocument(docId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => apiDelete(`/documents/${docId}/checkout/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['document_checkout', docId] })
      qc.invalidateQueries({ queryKey: ['checkouts'] })
    },
  })
}

/* ------------------------------ Signatures --------------------------- */

export function useFileSignatures(
  docId: number | null,
  fileId: number | null | undefined,
  kind: 'embedded' | 'detached',
) {
  return useQuery({
    queryKey: ['file_signatures', docId, fileId, kind] as const,
    queryFn: () =>
      apiGet<Paginated<DocumentSignature>>(
        `/documents/${docId}/files/${fileId}/signatures/${kind}/?page_size=100`,
      ),
    enabled: docId != null && fileId != null,
  })
}

/* ------------------------------ Workflows ---------------------------- */

export function useWorkflowTemplates() {
  return useQuery({
    queryKey: ['workflow_templates'] as const,
    queryFn: () =>
      apiGet<Paginated<WorkflowTemplate>>(`/workflow_templates/?page_size=100`),
  })
}

export function useWorkflowTemplate(id: number | null) {
  return useQuery({
    queryKey: ['workflow_template', id] as const,
    queryFn: () => apiGet<WorkflowTemplate>(`/workflow_templates/${id}/`),
    enabled: id != null,
  })
}

export function useWorkflowStates(id: number | null) {
  return useQuery({
    queryKey: ['workflow_states', id] as const,
    queryFn: () =>
      apiGet<Paginated<WorkflowState>>(
        `/workflow_templates/${id}/states/?page_size=100`,
      ),
    enabled: id != null,
  })
}

export function useWorkflowTransitions(id: number | null) {
  return useQuery({
    queryKey: ['workflow_transitions', id] as const,
    queryFn: () =>
      apiGet<Paginated<WorkflowTransition>>(
        `/workflow_templates/${id}/transitions/?page_size=100`,
      ),
    enabled: id != null,
  })
}

/** Workflow instances running on a document. */
export function useDocumentWorkflows(docId: number | null) {
  return useQuery({
    queryKey: ['document_workflows', docId] as const,
    queryFn: () =>
      apiGet<Paginated<WorkflowInstance>>(
        `/documents/${docId}/workflow_instances/?page_size=100`,
      ),
    enabled: docId != null,
  })
}

/** History (log entries) for a single workflow instance. */
export function useWorkflowLogEntries(
  docId: number | null,
  instanceId: number | null | undefined,
) {
  return useQuery({
    queryKey: ['workflow_log', docId, instanceId] as const,
    queryFn: () =>
      apiGet<Paginated<WorkflowLogEntry>>(
        `/documents/${docId}/workflow_instances/${instanceId}/log_entries/?page_size=100`,
      ),
    enabled: docId != null && instanceId != null,
  })
}

/**
 * Perform a transition on a document's workflow instance by POSTing a log
 * entry with the chosen transition_id.
 */
export function useWorkflowTransition(docId: number, instanceId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { transition_id: number; comment?: string }) =>
      apiPost(
        `/documents/${docId}/workflow_instances/${instanceId}/log_entries/`,
        vars,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['document_workflows', docId] })
      qc.invalidateQueries({ queryKey: ['workflow_log', docId, instanceId] })
    },
  })
}

/* --------------------------------------------------------------------- */
/* ACCESS CONTROL — Users / Groups / Roles / Permissions / ACLs          */
/* --------------------------------------------------------------------- */

/* ------------------------------- Users ------------------------------- */

export function useUsers() {
  return useQuery({
    queryKey: ['users'] as const,
    queryFn: () => apiGet<Paginated<User>>(`/users/?page_size=200`),
  })
}

export function useUser(id: number | null) {
  return useQuery({
    queryKey: ['user', id] as const,
    queryFn: () => apiGet<User>(`/users/${id}/`),
    enabled: id != null,
  })
}

export interface UserInput {
  username: string
  first_name?: string
  last_name?: string
  email?: string
  password?: string
}

export function useCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: UserInput) => apiPost<User>(`/users/`, vars),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}

export function useUpdateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { id: number } & Partial<UserInput>) => {
      const { id, ...body } = vars
      return apiPatch<User>(`/users/${id}/`, body)
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['users'] })
      qc.invalidateQueries({ queryKey: ['user', vars.id] })
    },
  })
}

export function useDeleteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiDelete(`/users/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}

/** Groups a user belongs to (read-only endpoint; membership is edited via the group). */
export function useUserGroups(userId: number | null) {
  return useQuery({
    queryKey: ['user_groups', userId] as const,
    queryFn: () =>
      apiGet<Paginated<Group>>(`/users/${userId}/groups/?page_size=200`),
    enabled: userId != null,
  })
}

/* ------------------------------- Groups ------------------------------ */

export function useGroups() {
  return useQuery({
    queryKey: ['groups'] as const,
    queryFn: () => apiGet<Paginated<Group>>(`/groups/?page_size=200`),
  })
}

export function useGroup(id: number | null) {
  return useQuery({
    queryKey: ['group', id] as const,
    queryFn: () => apiGet<Group>(`/groups/${id}/`),
    enabled: id != null,
  })
}

export function useCreateGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { name: string }) => apiPost<Group>(`/groups/`, vars),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['groups'] }),
  })
}

export function useUpdateGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { id: number; name: string }) =>
      apiPatch<Group>(`/groups/${vars.id}/`, { name: vars.name }),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['groups'] })
      qc.invalidateQueries({ queryKey: ['group', vars.id] })
    },
  })
}

export function useDeleteGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiDelete(`/groups/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['groups'] }),
  })
}

/** Members (users) of a group. */
export function useGroupUsers(groupId: number | null) {
  return useQuery({
    queryKey: ['group_users', groupId] as const,
    queryFn: () =>
      apiGet<Paginated<User>>(`/groups/${groupId}/users/?page_size=200`),
    enabled: groupId != null,
  })
}

export function useAddUserToGroup(groupId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: number) =>
      apiPost(`/groups/${groupId}/users/add/`, { user: userId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['group_users', groupId] })
      qc.invalidateQueries({ queryKey: ['user_groups'] })
    },
  })
}

export function useRemoveUserFromGroup(groupId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: number) =>
      apiPost(`/groups/${groupId}/users/remove/`, { user: userId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['group_users', groupId] })
      qc.invalidateQueries({ queryKey: ['user_groups'] })
    },
  })
}

/* ------------------------------- Roles ------------------------------- */

export function useRoles() {
  return useQuery({
    queryKey: ['roles'] as const,
    queryFn: () => apiGet<Paginated<Role>>(`/roles/?page_size=200`),
  })
}

export function useRole(id: number | null) {
  return useQuery({
    queryKey: ['role', id] as const,
    queryFn: () => apiGet<Role>(`/roles/${id}/`),
    enabled: id != null,
  })
}

export function useCreateRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { label: string }) => apiPost<Role>(`/roles/`, vars),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roles'] }),
  })
}

export function useUpdateRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { id: number; label: string }) =>
      apiPatch<Role>(`/roles/${vars.id}/`, { label: vars.label }),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['roles'] })
      qc.invalidateQueries({ queryKey: ['role', vars.id] })
    },
  })
}

export function useDeleteRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiDelete(`/roles/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roles'] }),
  })
}

/** Groups assigned to a role. */
export function useRoleGroups(roleId: number | null) {
  return useQuery({
    queryKey: ['role_groups', roleId] as const,
    queryFn: () =>
      apiGet<Paginated<Group>>(`/roles/${roleId}/groups/?page_size=200`),
    enabled: roleId != null,
  })
}

export function useAddGroupToRole(roleId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (groupId: number) =>
      apiPost(`/roles/${roleId}/groups/add/`, { group: groupId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['role_groups', roleId] }),
  })
}

export function useRemoveGroupFromRole(roleId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (groupId: number) =>
      apiPost(`/roles/${roleId}/groups/remove/`, { group: groupId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['role_groups', roleId] }),
  })
}

/** Permissions granted to a role. */
export function useRolePermissions(roleId: number | null) {
  return useQuery({
    queryKey: ['role_permissions', roleId] as const,
    queryFn: () =>
      apiGet<Paginated<Permission>>(
        `/roles/${roleId}/permissions/?page_size=300`,
      ),
    enabled: roleId != null,
  })
}

export function useAddPermissionToRole(roleId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (permissionPk: string) =>
      apiPost(`/roles/${roleId}/permissions/add/`, { permission: permissionPk }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['role_permissions', roleId] }),
  })
}

export function useRemovePermissionFromRole(roleId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (permissionPk: string) =>
      apiPost(`/roles/${roleId}/permissions/remove/`, {
        permission: permissionPk,
      }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['role_permissions', roleId] }),
  })
}

/* ---------------------------- Permissions ---------------------------- */

/** The full catalog of permission definitions (read-only reference). */
export function usePermissions() {
  return useQuery({
    queryKey: ['permissions'] as const,
    queryFn: () =>
      apiGet<Paginated<Permission>>(`/permissions/?page_size=300`),
  })
}

/* ------------------------------- ACLs -------------------------------- */

/**
 * Per-object ACLs. Mayan keys ACLs by content type + object id under
 * /objects/{app_label}/{model}/{object_id}/acls/. For documents that is
 * /objects/documents/document/{docId}/acls/.
 */
const docAclBase = (docId: number) =>
  `/objects/documents/document/${docId}/acls/`

export function useDocumentAcls(docId: number | null) {
  return useQuery({
    queryKey: ['document_acls', docId] as const,
    queryFn: () =>
      apiGet<Paginated<AccessControlList>>(
        `${docAclBase(docId as number)}?page_size=200`,
      ),
    enabled: docId != null,
  })
}

export function useCreateDocumentAcl(docId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (roleId: number) =>
      apiPost<AccessControlList>(docAclBase(docId), { role_id: roleId }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['document_acls', docId] }),
  })
}

export function useDeleteDocumentAcl(docId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (aclId: number) =>
      apiDelete(`${docAclBase(docId)}${aclId}/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['document_acls', docId] })
    },
  })
}

/** Permissions granted on a specific ACL entry. */
export function useAclPermissions(docId: number | null, aclId: number | null) {
  return useQuery({
    queryKey: ['acl_permissions', docId, aclId] as const,
    queryFn: () =>
      apiGet<Paginated<Permission>>(
        `${docAclBase(docId as number)}${aclId}/permissions/?page_size=300`,
      ),
    enabled: docId != null && aclId != null,
  })
}

export function useAddAclPermission(docId: number, aclId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (permissionPk: string) =>
      apiPost(`${docAclBase(docId)}${aclId}/permissions/add/`, {
        permission: permissionPk,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['acl_permissions', docId, aclId] })
      qc.invalidateQueries({ queryKey: ['document_acls', docId] })
    },
  })
}

export function useRemoveAclPermission(docId: number, aclId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (permissionPk: string) =>
      apiPost(`${docAclBase(docId)}${aclId}/permissions/remove/`, {
        permission: permissionPk,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['acl_permissions', docId, aclId] })
      qc.invalidateQueries({ queryKey: ['document_acls', docId] })
    },
  })
}

/* --------------------------------------------------------------------- */
/* CAPSULE — tenancy (whoami / clients / provisioning / password)        */
/* --------------------------------------------------------------------- */

/** Current user's firm/role/client context. The login flow fetches this
 *  directly; this hook is for components that need to react to it. */
export function useWhoami() {
  const token = useAppStore((s) => s.token)
  return useQuery({
    queryKey: ['whoami'] as const,
    queryFn: () => apiGet<Whoami>(`/capsule/whoami/`),
    enabled: !!token,
  })
}

/** The accountant's firm clients. Endpoint returns a bare array. */
export function useClients() {
  const role = useAppStore((s) => s.role)
  return useQuery({
    queryKey: ['capsule_clients'] as const,
    queryFn: () => apiGet<CapsuleClient[]>(`/capsule/clients/`),
    enabled: role === 'accountant' || role === 'platform',
  })
}

/** A single client (resolved from the clients list — no per-id endpoint). */
export function useClient(id: number | null) {
  const clients = useClients()
  const client = clients.data?.find((c) => c.id === id) ?? null
  return { ...clients, client }
}

/** Provision a new client; returns temp credentials for the accountant. */
export function useProvisionClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { firm_id: number; display_name: string }) =>
      apiPost<ProvisionClientResult>(`/capsule/clients/`, vars),
    meta: { successMessage: 'Client created' },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['capsule_clients'] }),
  })
}

/**
 * First-login password change. Tries the Capsule endpoint (clears the flag
 * server-side); on 404 falls back to PATCH /users/current/. Either way we
 * clear the local mustChangePassword flag so the interceptor releases the
 * user (the PATCH fallback does NOT clear it server-side).
 */
/** The firm's grouping configuration (basis / depth / categories). */
export function useFirmSettings(firmId: number | null) {
  return useQuery({
    queryKey: ['firm_settings', firmId] as const,
    queryFn: () => apiGet<FirmSettings>(`/capsule/firms/${firmId}/settings/`),
    enabled: firmId != null,
  })
}

/** PATCH the firm's grouping configuration. */
export function useUpdateFirmSettings(firmId: number | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: Partial<FirmSettings>) =>
      apiPatch<FirmSettings>(`/capsule/firms/${firmId}/settings/`, vars),
    meta: { successMessage: 'Settings saved' },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['firm_settings', firmId] })
      qc.invalidateQueries({ queryKey: ['whoami'] })
    },
  })
}

export function usePasswordChange() {
  const qc = useQueryClient()
  const setMustChangePassword = useAppStore((s) => s.setMustChangePassword)
  return useMutation({
    mutationFn: (newPassword: string) => changePassword(newPassword),
    meta: { successMessage: 'Password changed' },
    onSuccess: () => {
      setMustChangePassword(false)
      qc.invalidateQueries({ queryKey: ['whoami'] })
    },
  })
}

/* --------------------------------------------------------------------- */
/* CAPSULE — document requests / checklist                               */
/* --------------------------------------------------------------------- */

/** Document requests for a client (visible to the client + firm accountants). */
export function useClientRequests(clientId: number | null) {
  return useQuery({
    queryKey: ['capsule_requests', clientId] as const,
    queryFn: () =>
      apiGet<CapsuleDocumentRequest[]>(
        `/capsule/clients/${clientId}/requests/`,
      ),
    enabled: clientId != null,
  })
}

/** Accountant creates a document request for a client. */
export function useCreateRequest(clientId: number | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: {
      period_key?: string
      category?: string
      note?: string
    }) =>
      apiPost<CapsuleDocumentRequest>(
        `/capsule/clients/${clientId}/requests/`,
        vars,
      ),
    meta: { successMessage: 'Document requested' },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['capsule_requests', clientId] }),
  })
}

/** Mark a request requested/fulfilled. Invalidates the owning client's list. */
export function useUpdateRequest(clientId: number | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { id: number; status: 'requested' | 'fulfilled' }) =>
      apiPatch<CapsuleDocumentRequest>(`/capsule/requests/${vars.id}/`, {
        status: vars.status,
      }),
    meta: { successMessage: 'Request updated' },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['capsule_requests', clientId] }),
  })
}

/* --------------------------------------------------------------------- */
/* CAPSULE — notifications (header bell)                                  */
/* --------------------------------------------------------------------- */

/** The current user's recent Capsule notifications + unread count. Polled. */
export function useCapsuleNotifications() {
  const token = useAppStore((s) => s.token)
  return useQuery({
    queryKey: ['capsule_notifications'] as const,
    queryFn: () =>
      apiGet<CapsuleNotificationList>(`/capsule/notifications/`),
    enabled: !!token,
    refetchInterval: 20000,
  })
}

/** Mark one (by id) or all of the user's notifications read. */
export function useMarkNotificationsRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id?: number) =>
      apiPost<{ updated: number }>(
        `/capsule/notifications/mark-read/`,
        id != null ? { id } : {},
      ),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['capsule_notifications'] }),
  })
}

export type { CapsuleNotification }
