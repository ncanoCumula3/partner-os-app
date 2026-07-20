import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import PasswordGate from "./components/PasswordGate";
import { ThemeProvider } from "./contexts/ThemeContext";
import { NotesProvider } from "./contexts/NotesContext";
import { MitigationEngineProvider } from "./contexts/MitigationEngineContext";
import { AdminSettingsProvider } from "./contexts/AdminSettingsContext";
import { ProjectsProvider } from "./contexts/ProjectsContext";
import { PipelineProvider } from "./contexts/PipelineContext";
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
      <PasswordGate>
        <ThemeProvider>
          <NotesProvider>
            <MitigationEngineProvider>
            <AdminSettingsProvider>
            <ProjectsProvider>
            <PipelineProvider>
            <TooltipProvider>
              <Toaster />
              <Router />
            </TooltipProvider>
            </PipelineProvider>
            </ProjectsProvider>
            </AdminSettingsProvider>
            </MitigationEngineProvider>
          </NotesProvider>
        </ThemeProvider>
      </PasswordGate>
    </ErrorBoundary>
  );
}

export default App;
