import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Content,
  Header,
  HeaderGlobalAction,
  HeaderGlobalBar,
  HeaderName,
  SideNav,
  SideNavItems,
  SideNavLink,
  SideNavMenu,
  SideNavMenuItem,
  Theme,
} from '@carbon/react'
import {
  Asleep,
  Catalog,
  Dashboard,
  DocumentMultiple_01,
  Favorite,
  FlowConnection,
  Folder,
  Light,
  Locked,
  Logout,
  Search as SearchIcon,
  Settings,
  Time,
  TrashCan,
  Upload,
  UserAdmin,
  UserMultiple,
} from '@carbon/icons-react'
import { useAppStore } from '../store/useAppStore'
import Notifications from './Notifications'
import NotificationBell from './NotificationBell'

export default function AppShell() {
  const navigate = useNavigate()
  const location = useLocation()
  const theme = useAppStore((s) => s.theme)
  const toggleTheme = useAppStore((s) => s.toggleTheme)
  const logout = useAppStore((s) => s.logout)
  const role = useAppStore((s) => s.role)
  const firm = useAppStore((s) => s.firm)

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  const isActive = (path: string) => location.pathname.startsWith(path)

  // Platform/superuser keeps the full existing tool set. Accountants get the
  // document tools plus Clients. Clients get only their workspace.
  const isPlatform = role === 'platform' || role == null
  const isAccountant = role === 'accountant'
  const isClient = role === 'client'

  return (
    <Theme theme={theme} className="capsule-shell">
      <Header aria-label="Capsule">
        <HeaderName href="#" prefix="" onClick={(e) => e.preventDefault()}>
          {firm?.name ? `Capsule — ${firm.name}` : 'Capsule'}
        </HeaderName>
        <HeaderGlobalBar>
          {!isClient && (
            <HeaderGlobalAction
              aria-label="Search"
              tooltipAlignment="end"
              onClick={() => navigate('/search')}
              data-testid="header-search"
            >
              <SearchIcon size={20} />
            </HeaderGlobalAction>
          )}
          {(isClient || isAccountant) && <NotificationBell />}
          <HeaderGlobalAction
            aria-label="Toggle theme"
            tooltipAlignment="end"
            onClick={toggleTheme}
            data-testid="theme-toggle"
          >
            {theme === 'g10' ? <Asleep size={20} /> : <Light size={20} />}
          </HeaderGlobalAction>
          <HeaderGlobalAction
            aria-label="Log out"
            tooltipAlignment="end"
            onClick={handleLogout}
            data-testid="logout"
          >
            <Logout size={20} />
          </HeaderGlobalAction>
        </HeaderGlobalBar>
      </Header>

      <SideNav aria-label="Side navigation" isRail expanded={false}>
        <SideNavItems>
          {isClient && (
            <>
              <SideNavLink
                renderIcon={DocumentMultiple_01}
                isActive={isActive('/workspace') && !isActive('/workspace/upload')}
                onClick={() => navigate('/workspace')}
                href="#"
              >
                My documents
              </SideNavLink>
              <SideNavLink
                renderIcon={Upload}
                isActive={isActive('/workspace/upload')}
                onClick={() => navigate('/workspace/upload')}
                href="#"
              >
                Upload
              </SideNavLink>
            </>
          )}

          {isAccountant && (
            <>
              <SideNavLink
                renderIcon={UserMultiple}
                isActive={isActive('/clients')}
                onClick={() => navigate('/clients')}
                href="#"
              >
                Clients
              </SideNavLink>
              <SideNavLink
                renderIcon={Settings}
                isActive={isActive('/settings')}
                onClick={() => navigate('/settings')}
                href="#"
                data-testid="nav-grouping"
              >
                Grouping
              </SideNavLink>
            </>
          )}

          {(isPlatform || isAccountant) && (
            <>
              {isPlatform && (
                <SideNavLink
                  renderIcon={Dashboard}
                  isActive={isActive('/dashboard')}
                  onClick={() => navigate('/dashboard')}
                  href="#"
                >
                  Dashboard
                </SideNavLink>
              )}
              <SideNavLink
                renderIcon={DocumentMultiple_01}
                isActive={isActive('/documents')}
                onClick={() => navigate('/documents')}
                href="#"
              >
                Documents
              </SideNavLink>
              <SideNavLink
                renderIcon={Folder}
                isActive={isActive('/cabinets')}
                onClick={() => navigate('/cabinets')}
                href="#"
              >
                Cabinets
              </SideNavLink>
              <SideNavLink
                renderIcon={Catalog}
                isActive={isActive('/indexes')}
                onClick={() => navigate('/indexes')}
                href="#"
              >
                Indexes
              </SideNavLink>
              <SideNavLink
                renderIcon={SearchIcon}
                isActive={isActive('/search')}
                onClick={() => navigate('/search')}
                href="#"
              >
                Search
              </SideNavLink>
              <SideNavLink
                renderIcon={FlowConnection}
                isActive={isActive('/workflows')}
                onClick={() => navigate('/workflows')}
                href="#"
              >
                Workflows
              </SideNavLink>
              <SideNavLink
                renderIcon={Locked}
                isActive={isActive('/checkouts')}
                onClick={() => navigate('/checkouts')}
                href="#"
              >
                Checkouts
              </SideNavLink>
              <SideNavLink
                renderIcon={Favorite}
                isActive={isActive('/favorites')}
                onClick={() => navigate('/favorites')}
                href="#"
              >
                Favorites
              </SideNavLink>
              <SideNavLink
                renderIcon={Time}
                isActive={isActive('/recently-created')}
                onClick={() => navigate('/recently-created')}
                href="#"
              >
                Recently created
              </SideNavLink>
              <SideNavLink
                renderIcon={TrashCan}
                isActive={isActive('/trash')}
                onClick={() => navigate('/trash')}
                href="#"
              >
                Trash
              </SideNavLink>
              <SideNavLink
                renderIcon={Upload}
                isActive={isActive('/upload')}
                onClick={() => navigate('/upload')}
                href="#"
              >
                Upload
              </SideNavLink>
            </>
          )}

          {isPlatform && (
            <SideNavMenu
              renderIcon={UserAdmin}
              title="Administration"
              defaultExpanded={isActive('/admin')}
              isActive={isActive('/admin')}
            >
              <SideNavMenuItem
                isActive={isActive('/admin/users')}
                onClick={() => navigate('/admin/users')}
                href="#"
              >
                Users
              </SideNavMenuItem>
              <SideNavMenuItem
                isActive={isActive('/admin/groups')}
                onClick={() => navigate('/admin/groups')}
                href="#"
              >
                Groups
              </SideNavMenuItem>
              <SideNavMenuItem
                isActive={isActive('/admin/roles')}
                onClick={() => navigate('/admin/roles')}
                href="#"
              >
                Roles
              </SideNavMenuItem>
              <SideNavMenuItem
                isActive={isActive('/admin/permissions')}
                onClick={() => navigate('/admin/permissions')}
                href="#"
              >
                Permissions
              </SideNavMenuItem>
              <SideNavMenuItem
                isActive={isActive('/admin/document-types')}
                onClick={() => navigate('/admin/document-types')}
                href="#"
              >
                Document types
              </SideNavMenuItem>
              <SideNavMenuItem
                isActive={isActive('/admin/metadata-types')}
                onClick={() => navigate('/admin/metadata-types')}
                href="#"
              >
                Metadata types
              </SideNavMenuItem>
              <SideNavMenuItem
                isActive={isActive('/admin/smart-links')}
                onClick={() => navigate('/admin/smart-links')}
                href="#"
              >
                Smart links
              </SideNavMenuItem>
              <SideNavMenuItem
                isActive={isActive('/admin/web-links')}
                onClick={() => navigate('/admin/web-links')}
                href="#"
              >
                Web links
              </SideNavMenuItem>
              <SideNavMenuItem
                isActive={isActive('/admin/events')}
                onClick={() => navigate('/admin/events')}
                href="#"
              >
                Events
              </SideNavMenuItem>
              <SideNavMenuItem
                isActive={isActive('/admin/settings')}
                onClick={() => navigate('/admin/settings')}
                href="#"
              >
                Settings
              </SideNavMenuItem>
            </SideNavMenu>
          )}
        </SideNavItems>
      </SideNav>

      <Content className="capsule-content">
        <Outlet />
      </Content>

      <Notifications />
    </Theme>
  )
}
