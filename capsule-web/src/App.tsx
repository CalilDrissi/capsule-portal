import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { GlobalTheme } from '@carbon/react'
import { useAppStore } from './store/useAppStore'
import type { CapsuleRole } from './store/useAppStore'
import LoginPage from './pages/LoginPage'
import InviteSetupPage from './pages/InviteSetupPage'
import ChangePasswordPage from './pages/ChangePasswordPage'
import AppShell from './components/AppShell'
import DocumentsPage from './pages/DocumentsPage'
import UploadPage from './pages/UploadPage'
import DocumentDetailPage from './pages/DocumentDetailPage'
import DashboardPage from './pages/DashboardPage'
import FavoritesPage from './pages/FavoritesPage'
import RecentlyCreatedPage from './pages/RecentlyCreatedPage'
import TrashPage from './pages/TrashPage'
import CabinetsPage from './pages/CabinetsPage'
import CabinetDetailPage from './pages/CabinetDetailPage'
import IndexesPage from './pages/IndexesPage'
import SearchPage from './pages/SearchPage'
import CheckoutsPage from './pages/CheckoutsPage'
import WorkflowsPage from './pages/WorkflowsPage'
import UsersPage from './pages/UsersPage'
import UserDetailPage from './pages/UserDetailPage'
import GroupsPage from './pages/GroupsPage'
import GroupDetailPage from './pages/GroupDetailPage'
import RolesPage from './pages/RolesPage'
import RoleDetailPage from './pages/RoleDetailPage'
import PermissionsPage from './pages/PermissionsPage'
import DocumentTypesPage from './pages/DocumentTypesPage'
import MetadataTypesPage from './pages/MetadataTypesPage'
import EventsPage from './pages/EventsPage'
import SmartLinksPage from './pages/SmartLinksPage'
import WebLinksPage from './pages/WebLinksPage'
import SettingsPage from './pages/SettingsPage'
import ClientsGridPage from './pages/ClientsGridPage'
import ClientWorkspacePage from './pages/ClientWorkspacePage'
import ClientWorkspaceSelfPage from './pages/ClientWorkspaceSelfPage'
import ClientUploadPage from './pages/ClientUploadPage'
import FirmSettingsPage from './pages/FirmSettingsPage'
import WorkspaceDocumentPage from './pages/WorkspaceDocumentPage'

/** Landing route for a given role (used by guards + the auth redirect). */
function landingFor(role: CapsuleRole): string {
  if (role === 'accountant') return '/clients'
  if (role === 'client') return '/workspace'
  return '/dashboard'
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = useAppStore((s) => s.token)
  const mustChangePassword = useAppStore((s) => s.mustChangePassword)
  const location = useLocation()
  if (!token) return <Navigate to="/login" replace />
  // First-login interceptor: force the password change before any other route.
  if (mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />
  }
  return <>{children}</>
}

/**
 * Role guard. `allow` lists the roles permitted on the wrapped route.
 * Platform (superuser/admin) is treated as all-access so the existing admin
 * and document experience is unchanged. Other roles are redirected to their
 * own landing page.
 */
function RequireRole({
  allow,
  children,
}: {
  allow: CapsuleRole[]
  children: React.ReactNode
}) {
  const role = useAppStore((s) => s.role)
  // Only an explicit platform role gets full access. A null/unknown role must
  // NOT fail open to admin — bounce to login for a clean re-auth.
  if (role == null) return <Navigate to="/login" replace />
  if (role === 'platform') return <>{children}</>
  if (allow.includes(role)) return <>{children}</>
  return <Navigate to={landingFor(role)} replace />
}

function RoleIndexRedirect() {
  const role = useAppStore((s) => s.role)
  return <Navigate to={landingFor(role)} replace />
}

export default function App() {
  const theme = useAppStore((s) => s.theme)

  return (
    <GlobalTheme theme={theme}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/invite/:token" element={<InviteSetupPage />} />
        <Route
          path="/change-password"
          element={
            <RequireAuthBare>
              <ChangePasswordPage />
            </RequireAuthBare>
          }
        />
        <Route
          path="/"
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          <Route index element={<RoleIndexRedirect />} />

          {/* Accountant tenancy routes */}
          <Route
            path="clients"
            element={
              <RequireRole allow={['accountant']}>
                <ClientsGridPage />
              </RequireRole>
            }
          />
          <Route
            path="clients/:id"
            element={
              <RequireRole allow={['accountant']}>
                <ClientWorkspacePage />
              </RequireRole>
            }
          />
          <Route
            path="clients/:cid/documents/:id"
            element={
              <RequireRole allow={['accountant']}>
                <WorkspaceDocumentPage />
              </RequireRole>
            }
          />
          <Route
            path="settings"
            element={
              <RequireRole allow={['accountant']}>
                <FirmSettingsPage />
              </RequireRole>
            }
          />

          {/* Client workspace routes */}
          <Route
            path="workspace"
            element={
              <RequireRole allow={['client']}>
                <ClientWorkspaceSelfPage />
              </RequireRole>
            }
          />
          <Route
            path="workspace/upload"
            element={
              <RequireRole allow={['client']}>
                <ClientUploadPage />
              </RequireRole>
            }
          />
          <Route
            path="workspace/documents/:id"
            element={
              <RequireRole allow={['client']}>
                <WorkspaceDocumentPage />
              </RequireRole>
            }
          />

          {/* Platform + accountant document tools (hidden from clients) */}
          <Route
            path="dashboard"
            element={
              <RequireRole allow={['accountant']}>
                <DashboardPage />
              </RequireRole>
            }
          />
          <Route
            path="documents"
            element={
              <RequireRole allow={['accountant']}>
                <DocumentsPage />
              </RequireRole>
            }
          />
          <Route
            path="documents/:id"
            element={
              <RequireRole allow={['accountant']}>
                <DocumentDetailPage />
              </RequireRole>
            }
          />
          <Route
            path="favorites"
            element={
              <RequireRole allow={['accountant']}>
                <FavoritesPage />
              </RequireRole>
            }
          />
          <Route
            path="recently-created"
            element={
              <RequireRole allow={['accountant']}>
                <RecentlyCreatedPage />
              </RequireRole>
            }
          />
          <Route
            path="trash"
            element={
              <RequireRole allow={['accountant']}>
                <TrashPage />
              </RequireRole>
            }
          />
          <Route
            path="upload"
            element={
              <RequireRole allow={['accountant']}>
                <UploadPage />
              </RequireRole>
            }
          />
          <Route
            path="cabinets"
            element={
              <RequireRole allow={['accountant']}>
                <CabinetsPage />
              </RequireRole>
            }
          />
          <Route
            path="cabinets/:id"
            element={
              <RequireRole allow={['accountant']}>
                <CabinetDetailPage />
              </RequireRole>
            }
          />
          <Route
            path="indexes"
            element={
              <RequireRole allow={['accountant']}>
                <IndexesPage />
              </RequireRole>
            }
          />
          <Route
            path="search"
            element={
              <RequireRole allow={['accountant']}>
                <SearchPage />
              </RequireRole>
            }
          />
          <Route
            path="workflows"
            element={
              <RequireRole allow={['accountant']}>
                <WorkflowsPage />
              </RequireRole>
            }
          />
          <Route
            path="checkouts"
            element={
              <RequireRole allow={['accountant']}>
                <CheckoutsPage />
              </RequireRole>
            }
          />

          {/* Platform-only admin routes */}
          <Route
            path="admin/users"
            element={
              <RequireRole allow={[]}>
                <UsersPage />
              </RequireRole>
            }
          />
          <Route
            path="admin/users/:id"
            element={
              <RequireRole allow={[]}>
                <UserDetailPage />
              </RequireRole>
            }
          />
          <Route
            path="admin/groups"
            element={
              <RequireRole allow={[]}>
                <GroupsPage />
              </RequireRole>
            }
          />
          <Route
            path="admin/groups/:id"
            element={
              <RequireRole allow={[]}>
                <GroupDetailPage />
              </RequireRole>
            }
          />
          <Route
            path="admin/roles"
            element={
              <RequireRole allow={[]}>
                <RolesPage />
              </RequireRole>
            }
          />
          <Route
            path="admin/roles/:id"
            element={
              <RequireRole allow={[]}>
                <RoleDetailPage />
              </RequireRole>
            }
          />
          <Route
            path="admin/permissions"
            element={
              <RequireRole allow={[]}>
                <PermissionsPage />
              </RequireRole>
            }
          />
          <Route
            path="admin/document-types"
            element={
              <RequireRole allow={[]}>
                <DocumentTypesPage />
              </RequireRole>
            }
          />
          <Route
            path="admin/metadata-types"
            element={
              <RequireRole allow={[]}>
                <MetadataTypesPage />
              </RequireRole>
            }
          />
          <Route
            path="admin/events"
            element={
              <RequireRole allow={[]}>
                <EventsPage />
              </RequireRole>
            }
          />
          <Route
            path="admin/smart-links"
            element={
              <RequireRole allow={[]}>
                <SmartLinksPage />
              </RequireRole>
            }
          />
          <Route
            path="admin/web-links"
            element={
              <RequireRole allow={[]}>
                <WebLinksPage />
              </RequireRole>
            }
          />
          <Route
            path="admin/settings"
            element={
              <RequireRole allow={[]}>
                <SettingsPage />
              </RequireRole>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </GlobalTheme>
  )
}

/** Auth check WITHOUT the change-password interceptor (used by that page). */
function RequireAuthBare({ children }: { children: React.ReactNode }) {
  const token = useAppStore((s) => s.token)
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}
