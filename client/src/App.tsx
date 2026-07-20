import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import PasswordGate from "./components/PasswordGate";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { NotesProvider } from "./contexts/NotesContext";
import { MitigationEngineProvider } from "./contexts/MitigationEngineContext";
import { AdminSettingsProvider } from "./contexts/AdminSettingsContext";
import { ProjectsProvider } from "./contexts/ProjectsContext";
import { PipelineProvider } from "./contexts/PipelineContext";
import { AccountsProvider } from "./contexts/AccountsContext";
import { UsersProvider } from "./contexts/UsersContext";
import Dashboard from "./pages/Dashboard";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route component={Dashboard} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
      <PasswordGate>
        <ThemeProvider>
          <NotesProvider>
            <MitigationEngineProvider>
            <AdminSettingsProvider>
            <AccountsProvider>
            <UsersProvider>
            <ProjectsProvider>
            <PipelineProvider>
            <TooltipProvider>
              <Toaster />
              <Router />
            </TooltipProvider>
            </PipelineProvider>
            </ProjectsProvider>
            </UsersProvider>
            </AccountsProvider>
            </AdminSettingsProvider>
            </MitigationEngineProvider>
          </NotesProvider>
        </ThemeProvider>
      </PasswordGate>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
