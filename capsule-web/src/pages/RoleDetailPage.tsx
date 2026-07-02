import { useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  Button,
  ComboBox,
  Dropdown,
  InlineLoading,
  Stack,
  Tag as CarbonTag,
  Tile,
} from '@carbon/react'
import { Add, Close } from '@carbon/icons-react'
import PageBreadcrumb from '../components/PageBreadcrumb'
import {
  useAddGroupToRole,
  useAddPermissionToRole,
  useGroups,
  usePermissions,
  useRemoveGroupFromRole,
  useRemovePermissionFromRole,
  useRole,
  useRoleGroups,
  useRolePermissions,
} from '../api/queries'
import type { Permission } from '../api/types'

export default function RoleDetailPage() {
  const { id } = useParams()
  const roleId = id ? Number(id) : null
  const { data: role, isLoading, isError } = useRole(roleId)
  const { data: roleGroups } = useRoleGroups(roleId)
  const { data: allGroups } = useGroups()
  const { data: rolePerms } = useRolePermissions(roleId)
  const { data: allPerms } = usePermissions()

  const addGroup = useAddGroupToRole(roleId ?? 0)
  const removeGroup = useRemoveGroupFromRole(roleId ?? 0)
  const addPerm = useAddPermissionToRole(roleId ?? 0)
  const removePerm = useRemovePermissionFromRole(roleId ?? 0)

  const [pickedGroupId, setPickedGroupId] = useState<number | null>(null)
  const [pickedPerm, setPickedPerm] = useState<Permission | null>(null)

  if (isLoading) return <InlineLoading description="Loading role…" />
  if (isError || !role)
    return (
      <div className="capsule-page">
        <PageBreadcrumb items={[{ label: 'Roles', to: '/admin/roles' }, { label: 'Not found' }]} />
        <Tile>Role not found.</Tile>
      </div>
    )

  const groups = roleGroups?.results ?? []
  const groupIds = new Set(groups.map((g) => g.id))
  const addableGroups = (allGroups?.results ?? []).filter((g) => !groupIds.has(g.id))
  const pickedGroup = addableGroups.find((g) => g.id === pickedGroupId) ?? null

  const perms = rolePerms?.results ?? []
  const permPks = new Set(perms.map((p) => p.pk))
  const addablePerms = (allPerms?.results ?? [])
    .filter((p) => !permPks.has(p.pk))
    .sort((a, b) =>
      `${a.namespace} ${a.label}`.localeCompare(`${b.namespace} ${b.label}`),
    )

  return (
    <div className="capsule-page">
      <PageBreadcrumb items={[{ label: 'Roles', to: '/admin/roles' }, { label: role.label }]} />
      <h2 className="capsule-page__title">{role.label}</h2>

      <Stack gap={7}>
        {/* Groups */}
        <div>
          <h3 className="capsule-section-title">Groups</h3>
          <Stack gap={5}>
            <div data-testid="role-groups-list">
              {groups.length === 0 ? (
                <Tile>No groups assigned to this role.</Tile>
              ) : (
                groups.map((g) => (
                  <span key={g.id} style={{ display: 'inline-flex', alignItems: 'center' }}>
                    <CarbonTag type="purple">{g.name}</CarbonTag>
                    <Button
                      kind="ghost"
                      size="sm"
                      hasIconOnly
                      iconDescription={`Remove ${g.name}`}
                      renderIcon={Close}
                      data-testid={`role-group-remove-${g.id}`}
                      disabled={removeGroup.isPending}
                      onClick={() => removeGroup.mutate(g.id)}
                    />
                  </span>
                ))
              )}
            </div>
            {addableGroups.length > 0 && (
              <Tile>
                <Stack gap={4}>
                  <strong>Assign a group</strong>
                  <Dropdown
                    id="role-group-pick"
                    titleText="Group"
                    label="Choose a group"
                    items={addableGroups}
                    selectedItem={pickedGroup}
                    itemToString={(i) => (i ? i.name : '')}
                    onChange={({ selectedItem }) =>
                      setPickedGroupId(selectedItem?.id ?? null)
                    }
                  />
                  <Button
                    renderIcon={Add}
                    data-testid="role-group-add-btn"
                    disabled={!pickedGroup || addGroup.isPending}
                    onClick={() =>
                      pickedGroup &&
                      addGroup.mutate(pickedGroup.id, {
                        onSuccess: () => setPickedGroupId(null),
                      })
                    }
                  >
                    Assign group
                  </Button>
                </Stack>
              </Tile>
            )}
          </Stack>
        </div>

        {/* Permissions */}
        <div>
          <h3 className="capsule-section-title">Permissions</h3>
          <Stack gap={5}>
            <div data-testid="role-permissions-list">
              {perms.length === 0 ? (
                <Tile>No permissions granted to this role.</Tile>
              ) : (
                perms.map((p) => (
                  <span key={p.pk} style={{ display: 'inline-flex', alignItems: 'center' }}>
                    <CarbonTag type="teal">
                      {p.namespace}: {p.label}
                    </CarbonTag>
                    <Button
                      kind="ghost"
                      size="sm"
                      hasIconOnly
                      iconDescription={`Revoke ${p.label}`}
                      renderIcon={Close}
                      data-testid={`role-perm-remove-${p.pk}`}
                      disabled={removePerm.isPending}
                      onClick={() => removePerm.mutate(p.pk)}
                    />
                  </span>
                ))
              )}
            </div>
            <Tile>
              <Stack gap={4}>
                <strong>Grant a permission</strong>
                <ComboBox
                  id="role-perm-pick"
                  titleText="Permission"
                  placeholder="Search permissions"
                  items={addablePerms}
                  selectedItem={pickedPerm}
                  itemToString={(i) => (i ? `${i.namespace}: ${i.label}` : '')}
                  onChange={({ selectedItem }) =>
                    setPickedPerm(selectedItem ?? null)
                  }
                />
                <Button
                  renderIcon={Add}
                  data-testid="role-perm-add-btn"
                  disabled={!pickedPerm || addPerm.isPending}
                  onClick={() =>
                    pickedPerm &&
                    addPerm.mutate(pickedPerm.pk, {
                      onSuccess: () => setPickedPerm(null),
                    })
                  }
                >
                  Grant permission
                </Button>
              </Stack>
            </Tile>
          </Stack>
        </div>
      </Stack>
    </div>
  )
}
