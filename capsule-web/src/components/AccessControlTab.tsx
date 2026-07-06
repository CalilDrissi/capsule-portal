import { useState } from 'react'
import {
  Button,
  ComboBox,
  Dropdown,
  InlineLoading,
  Stack,
  Tag as CarbonTag,
  Tile,
} from '@carbon/react'
import { Add, Close, TrashCan } from '@carbon/icons-react'
import {
  useAclPermissions,
  useAddAclPermission,
  useCreateDocumentAcl,
  useDeleteDocumentAcl,
  useDocumentAcls,
  usePermissions,
  useRemoveAclPermission,
  useRoles,
} from '../api/queries'
import type { AccessControlList, Permission } from '../api/types'

/**
 * Per-ACL card: lists the role's granted permissions on this document and lets
 * the operator grant/revoke individual permissions or delete the whole ACL.
 */
function AclCard({
  docId,
  acl,
  allPerms,
}: {
  docId: number
  acl: AccessControlList
  allPerms: Permission[]
}) {
  const addPerm = useAddAclPermission(docId, acl.id)
  const removePerm = useRemoveAclPermission(docId, acl.id)
  const deleteAcl = useDeleteDocumentAcl(docId)
  const { data: permData } = useAclPermissions(docId, acl.id)
  const [picked, setPicked] = useState<Permission | null>(null)

  // The ACL list does not embed permissions; fetch them per-ACL.
  const granted = permData?.results ?? []
  const grantedPks = new Set(granted.map((p) => p.pk))
  const addable = allPerms
    .filter((p) => !grantedPks.has(p.pk))
    .sort((a, b) =>
      `${a.namespace} ${a.label}`.localeCompare(`${b.namespace} ${b.label}`),
    )

  return (
    <Tile data-testid={`acl-card-${acl.id}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong>Rôle : {acl.role?.label}</strong>
        <Button
          kind="danger--ghost"
          size="sm"
          renderIcon={TrashCan}
          data-testid={`acl-delete-${acl.id}`}
          disabled={deleteAcl.isPending}
          onClick={() => deleteAcl.mutate(acl.id)}
        >
          Supprimer l'ACL
        </Button>
      </div>

      <div style={{ margin: '0.75rem 0' }} data-testid={`acl-perms-${acl.id}`}>
        {granted.length === 0 ? (
          <span className="capsule-hint">Aucune permission accordée pour le moment.</span>
        ) : (
          granted.map((p) => (
            <span key={p.pk} style={{ display: 'inline-flex', alignItems: 'center' }}>
              <CarbonTag type="teal">
                {p.namespace}: {p.label}
              </CarbonTag>
              <Button
                kind="ghost"
                size="sm"
                hasIconOnly
                iconDescription={`Révoquer ${p.label}`}
                renderIcon={Close}
                data-testid={`acl-perm-remove-${acl.id}-${p.pk}`}
                disabled={removePerm.isPending}
                onClick={() => removePerm.mutate(p.pk)}
              />
            </span>
          ))
        )}
      </div>

      <Stack gap={4}>
        <ComboBox
          id={`acl-perm-pick-${acl.id}`}
          titleText="Accorder une permission"
          placeholder="Rechercher des permissions"
          items={addable}
          selectedItem={picked}
          itemToString={(i) => (i ? `${i.namespace}: ${i.label}` : '')}
          onChange={({ selectedItem }) => setPicked(selectedItem ?? null)}
        />
        <Button
          renderIcon={Add}
          size="sm"
          data-testid={`acl-perm-add-${acl.id}`}
          disabled={!picked || addPerm.isPending}
          onClick={() =>
            picked &&
            addPerm.mutate(picked.pk, { onSuccess: () => setPicked(null) })
          }
        >
          Accorder la permission
        </Button>
      </Stack>
    </Tile>
  )
}

export default function AccessControlTab({ docId }: { docId: number }) {
  const { data: acls, isLoading } = useDocumentAcls(docId)
  const { data: roles } = useRoles()
  const { data: perms } = usePermissions()
  const createAcl = useCreateDocumentAcl(docId)
  const [pickedRoleId, setPickedRoleId] = useState<number | null>(null)

  if (isLoading) return <InlineLoading description="Chargement du contrôle d'accès…" />

  const aclList = acls?.results ?? []
  const usedRoleIds = new Set(aclList.map((a) => a.role?.id))
  const addableRoles = (roles?.results ?? []).filter((r) => !usedRoleIds.has(r.id))
  const pickedRole = addableRoles.find((r) => r.id === pickedRoleId) ?? null
  const allPerms = perms?.results ?? []

  return (
    <Stack gap={5}>
      <p className="capsule-hint">
        Les listes de contrôle d'accès accordent à un rôle des permissions spécifiques sur ce document.
      </p>

      <div data-testid="acl-list">
        {aclList.length === 0 ? (
          <Tile>Aucune entrée de contrôle d'accès pour ce document.</Tile>
        ) : (
          <Stack gap={4}>
            {aclList.map((acl) => (
              <AclCard key={acl.id} docId={docId} acl={acl} allPerms={allPerms} />
            ))}
          </Stack>
        )}
      </div>

      {addableRoles.length > 0 && (
        <Tile>
          <Stack gap={4}>
            <strong>Ajouter une ACL pour un rôle</strong>
            <Dropdown
              id="acl-role-pick"
              titleText="Rôle"
              label="Choisir un rôle"
              items={addableRoles}
              selectedItem={pickedRole}
              itemToString={(i) => (i ? i.label : '')}
              onChange={({ selectedItem }) =>
                setPickedRoleId(selectedItem?.id ?? null)
              }
            />
            <Button
              renderIcon={Add}
              data-testid="acl-add-btn"
              disabled={!pickedRole || createAcl.isPending}
              onClick={() =>
                pickedRole &&
                createAcl.mutate(pickedRole.id, {
                  onSuccess: () => setPickedRoleId(null),
                })
              }
            >
              Ajouter une ACL
            </Button>
          </Stack>
        </Tile>
      )}
    </Stack>
  )
}
