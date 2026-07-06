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
  Enterprise,
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
          {isPlatform && (
            <HeaderGlobalAction
              aria-label="Rechercher"
              tooltipAlignment="end"
              onClick={() => navigate('/search')}
              data-testid="header-search"
            >
              <SearchIcon size={20} />
            </HeaderGlobalAction>
          )}
          {(isClient || isAccountant) && <NotificationBell />}
          <HeaderGlobalAction
            aria-label="Changer de thème"
            tooltipAlignment="end"
            onClick={toggleTheme}
            data-testid="theme-toggle"
          >
            {theme === 'g10' ? <Asleep size={20} /> : <Light size={20} />}
          </HeaderGlobalAction>
          <HeaderGlobalAction
            aria-label="Se déconnecter"
            tooltipAlignment="end"
            onClick={handleLogout}
            data-testid="logout"
          >
            <Logout size={20} />
          </HeaderGlobalAction>
        </HeaderGlobalBar>
      </Header>

      <SideNav aria-label="Navigation latérale" isRail expanded={false}>
        <SideNavItems>
          {isClient && (
            <>
              <SideNavLink
                renderIcon={DocumentMultiple_01}
                isActive={isActive('/workspace') && !isActive('/workspace/upload')}
                onClick={() => navigate('/workspace')}
                href="#"
              >
                Mes documents
              </SideNavLink>
              <SideNavLink
                renderIcon={Upload}
                isActive={isActive('/workspace/upload')}
                onClick={() => navigate('/workspace/upload')}
                href="#"
              >
                Importer
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
                Regroupement
              </SideNavLink>
            </>
          )}

          {/* Generic Mayan document tools are platform-admin only. Accountants
              work client-first (Clients -> a client's workspace); the raw
              firm-wide document/cabinet/index/etc. pages were broken or
              inappropriate for them (see firm-UI audit). */}
          {isPlatform && (
            <>
              {isPlatform && (
                <>
                  <SideNavLink
                    renderIcon={Enterprise}
                    isActive={isActive('/firms')}
                    onClick={() => navigate('/firms')}
                    href="#"
                    data-testid="nav-firms"
                  >
                    Cabinets
                  </SideNavLink>
                  <SideNavLink
                    renderIcon={Dashboard}
                    isActive={isActive('/dashboard')}
                    onClick={() => navigate('/dashboard')}
                    href="#"
                  >
                    Tableau de bord
                  </SideNavLink>
                </>
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
                Classeurs
              </SideNavLink>
              <SideNavLink
                renderIcon={Catalog}
                isActive={isActive('/indexes')}
                onClick={() => navigate('/indexes')}
                href="#"
              >
                Index
              </SideNavLink>
              <SideNavLink
                renderIcon={SearchIcon}
                isActive={isActive('/search')}
                onClick={() => navigate('/search')}
                href="#"
              >
                Recherche
              </SideNavLink>
              <SideNavLink
                renderIcon={FlowConnection}
                isActive={isActive('/workflows')}
                onClick={() => navigate('/workflows')}
                href="#"
              >
                Flux de travail
              </SideNavLink>
              <SideNavLink
                renderIcon={Locked}
                isActive={isActive('/checkouts')}
                onClick={() => navigate('/checkouts')}
                href="#"
              >
                Emprunts
              </SideNavLink>
              <SideNavLink
                renderIcon={Favorite}
                isActive={isActive('/favorites')}
                onClick={() => navigate('/favorites')}
                href="#"
              >
                Favoris
              </SideNavLink>
              <SideNavLink
                renderIcon={Time}
                isActive={isActive('/recently-created')}
                onClick={() => navigate('/recently-created')}
                href="#"
              >
                Créés récemment
              </SideNavLink>
              <SideNavLink
                renderIcon={TrashCan}
                isActive={isActive('/trash')}
                onClick={() => navigate('/trash')}
                href="#"
              >
                Corbeille
              </SideNavLink>
              <SideNavLink
                renderIcon={Upload}
                isActive={isActive('/upload')}
                onClick={() => navigate('/upload')}
                href="#"
              >
                Importer
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
                Utilisateurs
              </SideNavMenuItem>
              <SideNavMenuItem
                isActive={isActive('/admin/groups')}
                onClick={() => navigate('/admin/groups')}
                href="#"
              >
                Groupes
              </SideNavMenuItem>
              <SideNavMenuItem
                isActive={isActive('/admin/roles')}
                onClick={() => navigate('/admin/roles')}
                href="#"
              >
                Rôles
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
                Types de document
              </SideNavMenuItem>
              <SideNavMenuItem
                isActive={isActive('/admin/metadata-types')}
                onClick={() => navigate('/admin/metadata-types')}
                href="#"
              >
                Types de métadonnée
              </SideNavMenuItem>
              <SideNavMenuItem
                isActive={isActive('/admin/smart-links')}
                onClick={() => navigate('/admin/smart-links')}
                href="#"
              >
                Liens intelligents
              </SideNavMenuItem>
              <SideNavMenuItem
                isActive={isActive('/admin/web-links')}
                onClick={() => navigate('/admin/web-links')}
                href="#"
              >
                Liens web
              </SideNavMenuItem>
              <SideNavMenuItem
                isActive={isActive('/admin/events')}
                onClick={() => navigate('/admin/events')}
                href="#"
              >
                Événements
              </SideNavMenuItem>
              <SideNavMenuItem
                isActive={isActive('/admin/settings')}
                onClick={() => navigate('/admin/settings')}
                href="#"
              >
                Paramètres
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
