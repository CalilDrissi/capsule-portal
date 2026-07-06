export interface Paginated<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface DocumentType {
  id: number
  label: string
  url: string
}

export interface DocumentPage {
  id: number
  page_number: number
  image_url: string
  url: string
}

export interface DocumentVersion {
  id: number
  active: boolean
  timestamp: string
  page_list_url?: string
  pages_first?: DocumentPage | null
}

export interface DocumentFile {
  id: number
  filename: string
  mimetype: string
  size: number
  checksum: string
  timestamp: string
  file?: string
  url: string
  page_list_url?: string
  pages_first?: DocumentPage | null
}

export interface DocumentSummary {
  id: number
  label: string
  description?: string
  datetime_created: string
  document_type: DocumentType
  url: string
  file_latest?: DocumentFile | null
  version_active?: DocumentVersion | null
}

export interface DocumentDetail extends DocumentSummary {
  uuid: string
  language: string
}

export interface MetadataType {
  id: number
  label: string
  name: string
  url: string
}

/** A metadata type made available on a document type. */
export interface DocumentTypeMetadataType {
  id: number
  required: boolean
  metadata_type: MetadataType
  url: string
}

/** A metadata value attached to a document. */
export interface DocumentMetadata {
  id: number
  value: string | null
  metadata_type: MetadataType
  url: string
}

export interface Tag {
  id: number
  label: string
  color: string
  url: string
}

export interface DocumentComment {
  id: number
  text: string
  submit_date: string
  url: string
  user?: { id: number; username: string }
}

/** A document item nested inside a favorite record. */
export interface FavoriteDocument {
  id: number
  document: DocumentSummary
  datetime_added: string
  url: string
}

export interface TrashedDocument extends DocumentSummary {
  trashed_date_time: string
  restore_url: string
}

export interface Source {
  id: number
  label: string
  enabled: boolean
  backend_path: string
  url: string
}

/* ------------------------------ Cabinets ----------------------------- */

export interface Cabinet {
  id: number
  label: string
  full_path: string
  parent: number | null
  parent_id: number | null
  parent_url: string
  documents_url: string
  url: string
  children: Cabinet[]
}

/* ------------------------------ Indexes ------------------------------ */

export interface IndexInstance {
  id: number
  label: string
  depth: number
  node_count: number
  nodes_url: string
  url: string
}

export interface IndexInstanceNode {
  id: number
  value: string
  level: number
  node_count: number
  parent_id: number | null
  parent_url: string
  children_url: string
  documents_url: string
  index_url: string
  url: string
}

/* ------------------------------- Search ------------------------------ */

export interface SearchField {
  field_name: string
  label: string
  field_class_label: string
  get_help_text: string
  get_search_field_class_label: string
}

export interface SearchModel {
  pk: string
  model_name: string
  app_label: string
  search_fields: SearchField[]
}

export interface SavedResultset {
  id: number
  search_model_pk?: string
  datetime_created?: string
  url: string
  [key: string]: unknown
}

/* ------------------------------- Content ----------------------------- */

/** OCR / parsed text content for a single page. */
export interface PageContent {
  content: string
}

/* ------------------------------ Checkouts ---------------------------- */

export interface ApiUser {
  id: number
  username: string
  first_name?: string
  last_name?: string
  email?: string
}

export interface Checkout {
  id: number
  checkout_datetime: string
  expiration_datetime: string
  document: DocumentSummary
  user: ApiUser
  url: string
}

/* ------------------------------ Signatures --------------------------- */

export interface DocumentSignature {
  id: number
  date?: string | null
  date_time?: string | null
  key_id?: string | null
  signature_id?: string | null
  public_key_fingerprint?: string | null
  signature_id_url?: string | null
  url?: string
  document_file_url?: string
  // signer details surface under different keys across builds
  [key: string]: unknown
}

/* ------------------------------ Workflows ---------------------------- */

export interface WorkflowState {
  id: number
  label: string
  initial: boolean
  final: boolean
  completion: number
  url: string
  workflow_template_id?: number
}

export interface WorkflowTransition {
  id: number
  label: string
  origin_state: WorkflowState
  destination_state: WorkflowState
  condition?: string
  url: string
}

export interface WorkflowTemplate {
  id: number
  label: string
  internal_name: string
  auto_launch: boolean
  states_url: string
  transitions_url: string
  documents_url: string
  document_types_url: string
  image_url: string
  url: string
}

export interface WorkflowLogEntry {
  id: number
  datetime: string
  comment: string
  transition: WorkflowTransition
  user: ApiUser
  url: string
}

export interface WorkflowInstance {
  id: number
  current_state: WorkflowState | null
  last_log_entry: WorkflowLogEntry | null
  log_entries_url: string
  document_url: string
  workflow_template: WorkflowTemplate
  url: string
}

/* --------------------------- Access control -------------------------- */

export interface User {
  id: number
  username: string
  first_name: string
  last_name: string
  email: string
  is_active: boolean
  date_joined: string
  last_login: string | null
  groups_url: string
  url: string
}

export interface Group {
  id: number
  name: string
  users_url: string
  users_add_url: string
  users_remove_url: string
  url: string
}

export interface Role {
  id: number
  label: string
  groups_url: string
  groups_add_url: string
  groups_remove_url: string
  permissions_url: string
  permissions_add_url: string
  permissions_remove_url: string
  url: string
}

/** A permission definition. Keyed by a string `pk` (e.g. "documents.document_view"). */
export interface Permission {
  pk: string
  namespace: string
  label: string
}

/** An access control list entry binding a role to an object. */
export interface AccessControlList {
  id: number
  object_id: number
  content_type: {
    app_label: string
    id: number
    model: string
    url: string
  }
  role: Role
  permissions_url: string
  permissions_add_url: string
  permissions_remove_url: string
  url: string
}

/* ------------------------- Capsule tenancy ------------------------- */

export type CapsuleRole = 'platform' | 'accountant' | 'client'

export interface Whoami {
  user: { id: number; username: string }
  firm: { id: number; name: string } | null
  role: CapsuleRole | null
  client_id: number | null
  must_change_password: boolean
  document_type_id: number | null
  source_id: number | null
  category_metadata_type_id: number | null
  document_date_metadata_type_id: number | null
  categories: string[]
}

/** The firm's grouping configuration (GET/PATCH /capsule/firms/<id>/settings/). */
export interface FirmSettings {
  period_basis: 'created_date' | 'upload_date' | 'document_date'
  period_depth: 'Y' | 'YM' | 'YQM'
  categories: string[]
}

export interface CapsuleClient {
  id: number
  firm_id: number
  user_id: number
  display_name: string
  company_name?: string
  contact_name?: string
  contact_email?: string
  contact_phone?: string
  address?: string
  tax_id?: string
  notes?: string
  is_active?: boolean
  logo?: string
  cabinet_id: number
  client_role_id: number
  client_group_id: number
  must_change_password: boolean
}

/** One login belonging to a client company (primary owner or an employee). */
export interface ClientUser {
  id: number
  user_id: number
  username: string
  first_name: string
  is_active: boolean
  is_primary: boolean
  has_invite: boolean
}

/** An accountant login of a firm. */
export interface AccountantSummary {
  user_id: number
  username: string
  first_name: string
  is_active: boolean
}

/** Map of document id -> who uploaded it (GET /capsule/clients/<id>/document-uploaders/). */
export type DocumentUploaders = Record<
  string,
  { username: string; display: string }
>

/** Result of adding an employee login / regenerating an invite. */
export interface InviteResult {
  username?: string
  invite_token?: string
  invite_path?: string | null
}

export interface ProvisionClientResult {
  client: CapsuleClient
  temp_username: string
  temp_password: string
  invite_token: string | null
  invite_path: string | null
}

/** A firm (tenant). Returned by GET/POST /capsule/firms/ (platform admin). */
export interface Firm {
  id: number
  name: string
  slug: string
  contact_email?: string
  is_active?: boolean
  logo?: string
  accountant_group_id: number | null
  accountant_role_id: number | null
  document_type_id: number | null
  document_date_metadata_type_id: number | null
  category_metadata_type_id: number | null
  index_template_id: number | null
  workflow_id: number | null
}

/** Result of POST /capsule/firms/<id>/accountants/. */
export interface AccountantCreateResult {
  user: { id: number; username: string }
  firm_id: number
  membership_id: number
}

/** A document request / checklist item (GET /capsule/clients/<id>/requests/). */
export interface CapsuleDocumentRequest {
  id: number
  firm_id: number
  client_id: number
  period_key: string
  category: string
  status: 'requested' | 'fulfilled'
  requested_by_id: number | null
  datetime_created: string
}

/** A Capsule notification (GET /capsule/notifications/). */
export interface CapsuleNotification {
  id: number
  firm_id: number
  kind: 'upload' | 'request'
  message: string
  document_id: number | null
  read: boolean
  datetime_created: string
}

export interface CapsuleNotificationList {
  unread_count: number
  results: CapsuleNotification[]
}
