/*
 * Dashboard — main layout page assembling sidebar, topbar, and content views
 * Light enterprise teal theme
 */
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import DashboardView from "@/components/views/DashboardView";
import AccountsView from "@/components/views/AccountsView";
import PipelineView from "@/components/views/PipelineView";
import SupportView from "@/components/views/SupportView";
import EngagementHubView from "@/components/views/EngagementHubView";
import CSATView from "@/components/views/CSATView";
import ARTrackerView from "@/components/views/ARTrackerView";
import PlaybooksView from "@/components/views/PlaybooksView";
import AIAssistantView from "@/components/views/AIAssistantView";
import TeamChatView from "@/components/views/TeamChatView";
import KnowledgeBaseView from "@/components/views/KnowledgeBaseView";
import SLAConfigView from "@/components/views/SLAConfigView";
import SLATrackerView from "@/components/views/SLATrackerView";
import IntegrationsView from "@/components/views/IntegrationsView";
import ReportingView from "@/components/views/ReportingView";
import NotesView from "@/components/views/NotesView";
import RenewalTrackerView from "@/components/views/RenewalTrackerView";
import DownsellMitigationView from "@/components/views/DownsellMitigationView";
import AdminSettingsView from "@/components/views/AdminSettingsView";
import MomentInTimeView from "@/components/views/MomentInTimeView";
import ProjectsView from "@/components/views/ProjectsView";
import ProjectDetailView from "@/components/views/ProjectDetailView";
import DealDetailView from "@/components/views/DealDetailView";
import type { NavId } from "@/lib/data";

export default function Dashboard() {
  const [active, setActive] = useState<NavId>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [momentAccountId, setMomentAccountId] = useState<number | undefined>(undefined);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [selectedDealId, setSelectedDealId] = useState<number | null>(null);

  // Reset project drill-down when navigating away
  const handleNavigate = (id: NavId) => {
    if (id !== "projects") setSelectedProjectId(null);
    if (id !== "pipeline") setSelectedDealId(null);
    setActive(id);
  };

  /* Render the active view — DashboardView gets onNavigate so its SLA widget
     can link through to the full SLA Tracker page */
  function renderView() {
    switch (active) {
      case "dashboard":
        return <DashboardView onNavigate={(id: string) => handleNavigate(id as NavId)} />;
      case "accounts":
        return <AccountsView onNavigateToMoment={(id: number) => { setMomentAccountId(id); setActive("moment" as NavId); }} />;
      case "moment":
        return <MomentInTimeView accountId={momentAccountId} onNavigate={(id: string) => handleNavigate(id as NavId)} onBack={() => handleNavigate("accounts" as NavId)} />;
      case "projects":
        return selectedProjectId ? (
          <ProjectDetailView projectId={selectedProjectId} onBack={() => setSelectedProjectId(null)} />
        ) : (
          <ProjectsView onSelectProject={(id: number) => setSelectedProjectId(id)} />
        );
      case "pipeline":
        return selectedDealId ? (
          <DealDetailView dealId={selectedDealId} onBack={() => setSelectedDealId(null)} />
        ) : (
          <PipelineView onSelectDeal={(id: number) => setSelectedDealId(id)} />
        );
      case "support":
        return <SupportView />;
      case "outreach":
        return <EngagementHubView />;
      case "csat":
        return <CSATView />;
      case "ar":
        return <ARTrackerView />;
      case "playbooks":
        return <PlaybooksView />;
      case "ai":
        return <AIAssistantView />;
      case "chat":
        return <TeamChatView />;
      case "kb":
        return <KnowledgeBaseView />;
      case "sla-config":
        return <SLAConfigView />;
      case "sla-tracker":
        return <SLATrackerView />;
      case "notes":
        return <NotesView onNavigate={(id: string) => handleNavigate(id as NavId)} />;
      case "renewals":
        return <RenewalTrackerView onNavigate={(id: string) => handleNavigate(id as NavId)} />;
      case "downsell":
        return <DownsellMitigationView onNavigate={(id: string) => handleNavigate(id as NavId)} />;
      case "reporting":
        return <ReportingView />;
      case "integrations":
        return <IntegrationsView />;
      case "admin-settings":
        return <AdminSettingsView />;
      default:
        return <DashboardView onNavigate={(id: string) => handleNavigate(id as NavId)} />;
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        active={active}
        onNavigate={handleNavigate}
        open={sidebarOpen}
        onToggle={() => setSidebarOpen((o) => !o)}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar
          onToggleSidebar={() => setSidebarOpen((o) => !o)}
          active={active}
        onNavigate={handleNavigate}
      />

        <main className="flex-1 overflow-auto">
          <div className="p-6 max-w-[1400px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                {renderView()}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}
