import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./lib/auth";
import { Layout } from "./components/Layout";
import { AppModeProvider } from "./lib/app-mode";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { DashboardPage } from "./pages/DashboardPage";
import { LanesPage } from "./pages/LanesPage";
import { ClientsPage } from "./pages/ClientsPage";
import { ProjectsPage } from "./pages/ProjectsPage";
import { TasksPage } from "./pages/TasksPage";
import { ReportsPage } from "./pages/ReportsPage";
import { AdminUsersPage } from "./pages/AdminUsersPage";
import { AdminSettingsPage } from "./pages/AdminSettingsPage";
import { ProfileSettingsPage } from "./pages/ProfileSettingsPage";
import { ManageDataPage } from "./pages/ManageDataPage";
import { CalendarPage } from "./pages/CalendarPage";
import { WorkHoursSettingsPage } from "./pages/WorkHoursSettingsPage";

function Protected({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth();
  if (!ready) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AdminOnly({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useAuth();
  if (!isAdmin) return <Navigate to="/app/dashboard" replace />;
  return <>{children}</>;
}

export function App() {
  const { user, ready } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={!ready ? null : user ? <Navigate to="/app/dashboard" /> : <LoginPage />}
      />
      <Route
        path="/register"
        element={!ready ? null : user ? <Navigate to="/app/dashboard" /> : <RegisterPage />}
      />
      <Route
        path="/app"
        element={
          <Protected>
            <AppModeProvider>
              <Layout />
            </AppModeProvider>
          </Protected>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="lanes" element={<Navigate to="/app/settings/lanes" replace />} />
        <Route path="clients" element={<ClientsPage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<Navigate to="profile" replace />} />
        <Route path="settings/profile" element={<ProfileSettingsPage />} />
        <Route path="settings/work-hours" element={<WorkHoursSettingsPage />} />
        <Route path="settings/lanes" element={<LanesPage />} />
        <Route path="settings/data" element={<ManageDataPage />} />
        <Route
          path="admin/users"
          element={
            <AdminOnly>
              <AdminUsersPage />
            </AdminOnly>
          }
        />
        <Route
          path="admin/settings"
          element={
            <AdminOnly>
              <AdminSettingsPage />
            </AdminOnly>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to={user ? "/app/dashboard" : "/login"} replace />} />
    </Routes>
  );
}
