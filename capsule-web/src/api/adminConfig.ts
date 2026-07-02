import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiDelete, apiGet, apiPatch, apiPost } from './client'
import type { DocumentType, Paginated } from './types'

/* ----------------------------- Types ----------------------------- */

export interface DocumentTypeFull extends DocumentType {
  delete_time_period?: number | null
  delete_time_unit?: string | null
  trash_time_period?: number | null
  trash_time_unit?: string | null
  filename_generator_backend?: string
}

export interface MetadataType {
  id: number
  name: string
  label: string
  default?: string | null
  lookup?: string | null
  validation?: string | null
  parser?: string | null
  url: string
}

export interface EventItem {
  id: number
  actor: unknown
  verb: unknown
  description: string | null
  target: unknown
  timestamp: string
}

export interface SmartLink {
  id: number
  label: string
  dynamic_label?: string | null
  enabled: boolean
  conditions_url?: string
  url: string
}

export interface SmartLinkCondition {
  id: number
  foreign_document_data: string
  operator: string
  expression: string
  negated: boolean
  enabled: boolean
  url: string
}

export interface WebLink {
  id: number
  label: string
  template: string
  enabled: boolean
  url: string
}

/* ------------------------- Document types ------------------------- */

export function useDocumentTypesAdmin() {
  return useQuery({
    queryKey: ['admin_document_types'] as const,
    queryFn: () =>
      apiGet<Paginated<DocumentTypeFull>>(`/document_types/?page_size=100`),
  })
}
export function useCreateDocumentType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Partial<DocumentTypeFull>) =>
      apiPost(`/document_types/`, body),
    meta: { successMessage: 'Document type created' },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin_document_types'] }),
  })
}
export function useUpdateDocumentType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { id: number; body: Partial<DocumentTypeFull> }) =>
      apiPatch(`/document_types/${v.id}/`, v.body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin_document_types'] }),
  })
}
export function useDeleteDocumentType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiDelete(`/document_types/${id}/`),
    meta: { successMessage: 'Document type deleted' },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin_document_types'] }),
  })
}

/** Metadata types associated with a document type. */
export function useDocTypeMetadataTypes(typeId: number | null) {
  return useQuery({
    queryKey: ['doctype_metadata_assoc', typeId] as const,
    queryFn: () =>
      apiGet<Paginated<{ id: number; metadata_type: MetadataType; required: boolean }>>(
        `/document_types/${typeId}/metadata_types/?page_size=100`,
      ),
    enabled: typeId != null,
  })
}
export function useAddDocTypeMetadataType(typeId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (metadataTypeId: number) =>
      apiPost(`/document_types/${typeId}/metadata_types/`, {
        metadata_type_id: metadataTypeId,
      }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['doctype_metadata_assoc', typeId] }),
  })
}
export function useRemoveDocTypeMetadataType(typeId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (assocId: number) =>
      apiDelete(`/document_types/${typeId}/metadata_types/${assocId}/`),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['doctype_metadata_assoc', typeId] }),
  })
}

/* ------------------------- Metadata types ------------------------- */

export function useMetadataTypes() {
  return useQuery({
    queryKey: ['metadata_types'] as const,
    queryFn: () => apiGet<Paginated<MetadataType>>(`/metadata_types/?page_size=100`),
  })
}
export function useCreateMetadataType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Partial<MetadataType>) => apiPost(`/metadata_types/`, body),
    meta: { successMessage: 'Metadata type created' },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['metadata_types'] }),
  })
}
export function useUpdateMetadataType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { id: number; body: Partial<MetadataType> }) =>
      apiPatch(`/metadata_types/${v.id}/`, v.body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['metadata_types'] }),
  })
}
export function useDeleteMetadataType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiDelete(`/metadata_types/${id}/`),
    meta: { successMessage: 'Metadata type deleted' },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['metadata_types'] }),
  })
}

/* ------------------------------ Events ---------------------------- */

export function useEvents(page: number, pageSize: number) {
  return useQuery({
    queryKey: ['events', page, pageSize] as const,
    queryFn: () =>
      apiGet<Paginated<EventItem>>(`/events/?page=${page}&page_size=${pageSize}`),
    placeholderData: (p) => p,
  })
}

/* --------------------------- Smart links -------------------------- */

export function useSmartLinks() {
  return useQuery({
    queryKey: ['smart_links'] as const,
    queryFn: () => apiGet<Paginated<SmartLink>>(`/smart_links/?page_size=100`),
  })
}
export function useCreateSmartLink() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Partial<SmartLink>) => apiPost(`/smart_links/`, body),
    meta: { successMessage: 'Smart link created' },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['smart_links'] }),
  })
}
export function useUpdateSmartLink() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { id: number; body: Partial<SmartLink> }) =>
      apiPatch(`/smart_links/${v.id}/`, v.body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['smart_links'] }),
  })
}
export function useDeleteSmartLink() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiDelete(`/smart_links/${id}/`),
    meta: { successMessage: 'Smart link deleted' },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['smart_links'] }),
  })
}
export function useSmartLinkConditions(id: number | null) {
  return useQuery({
    queryKey: ['smart_link_conditions', id] as const,
    queryFn: () =>
      apiGet<Paginated<SmartLinkCondition>>(
        `/smart_links/${id}/conditions/?page_size=100`,
      ),
    enabled: id != null,
  })
}

/* ---------------------------- Web links --------------------------- */

export function useWebLinks() {
  return useQuery({
    queryKey: ['web_links'] as const,
    queryFn: () => apiGet<Paginated<WebLink>>(`/web_links/?page_size=100`),
  })
}
export function useCreateWebLink() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Partial<WebLink>) => apiPost(`/web_links/`, body),
    meta: { successMessage: 'Web link created' },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['web_links'] }),
  })
}
export function useUpdateWebLink() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { id: number; body: Partial<WebLink> }) =>
      apiPatch(`/web_links/${v.id}/`, v.body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['web_links'] }),
  })
}
export function useDeleteWebLink() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiDelete(`/web_links/${id}/`),
    meta: { successMessage: 'Web link deleted' },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['web_links'] }),
  })
}
