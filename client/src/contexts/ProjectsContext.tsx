/**
 * ProjectsContext — Shared mutable state for service projects.
 * Wraps the seed data from projects.ts and exposes add/update helpers
 * so new projects appear immediately across Dashboard, ProjectsView,
 * ProjectDetailView, and MomentInTimeView.
 */
import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import {
  SERVICE_PROJECTS as SEED_PROJECTS,
  type ServiceProject,
  type TimeEntry,
  type ProjectNote,
} from "@/lib/projects";

interface ProjectsContextValue {
  projects: ServiceProject[];
  addProject: (project: Omit<ServiceProject, "id">) => ServiceProject;
  updateProject: (id: number, updates: Partial<ServiceProject>) => void;
  addTimeEntry: (projectId: number, entry: Omit<TimeEntry, "id">) => void;
  addNote: (projectId: number, note: Omit<ProjectNote, "id">) => void;
  updateNote: (projectId: number, noteId: number, updates: Partial<ProjectNote>) => void;
  deleteNote: (projectId: number, noteId: number) => void;
  togglePinNote: (projectId: number, noteId: number) => void;
  getProject: (id: number) => ServiceProject | undefined;
  getProjectsForAccount: (accountId: number) => ServiceProject[];
  getActiveProjects: () => ServiceProject[];
  getNotesForAccount: (accountId: number) => (ProjectNote & { projectName: string })[];
}

const ProjectsContext = createContext<ProjectsContextValue | null>(null);

export function ProjectsProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<ServiceProject[]>([...SEED_PROJECTS]);

  const addProject = useCallback((data: Omit<ServiceProject, "id">): ServiceProject => {
    const newId = Math.max(0, ...projects.map(p => p.id)) + 1;
    const project: ServiceProject = { ...data, id: newId };
    setProjects(prev => [...prev, project]);
    return project;
  }, [projects]);

  const updateProject = useCallback((id: number, updates: Partial<ServiceProject>) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  }, []);

  const addTimeEntry = useCallback((projectId: number, entry: Omit<TimeEntry, "id">) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      const newId = Math.max(0, ...p.timeEntries.map(te => te.id)) + 1;
      const newEntry: TimeEntry = { ...entry, id: newId };
      // Also update the task's hoursLogged and project-level hoursLogged + budgetConsumed
      const updatedTasks = p.tasks.map(t =>
        t.id === entry.taskId ? { ...t, hoursLogged: t.hoursLogged + entry.hours } : t
      );
      const newHoursLogged = p.hoursLogged + entry.hours;
      const hourlyRate = p.hourlyRate || (p.hoursEstimated > 0 ? p.contractValue / p.hoursEstimated : 0);
      const newBudgetConsumed = p.budgetConsumed + (entry.hours * hourlyRate);
      return {
        ...p,
        timeEntries: [...p.timeEntries, newEntry],
        tasks: updatedTasks,
        hoursLogged: newHoursLogged,
        budgetConsumed: Math.round(newBudgetConsumed),
      };
    }));
  }, []);

  const getProject = useCallback((id: number) => {
    return projects.find(p => p.id === id);
  }, [projects]);

  const getProjectsForAccount = useCallback((accountId: number) => {
    return projects.filter(p => p.accountId === accountId);
  }, [projects]);

  const addNote = useCallback((projectId: number, note: Omit<ProjectNote, "id">) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      const newId = Math.max(0, ...p.notes.map(n => n.id)) + 1;
      const newNote: ProjectNote = { ...note, id: newId };
      return { ...p, notes: [newNote, ...p.notes] };
    }));
  }, []);

  const updateNote = useCallback((projectId: number, noteId: number, updates: Partial<ProjectNote>) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      return {
        ...p,
        notes: p.notes.map(n => n.id === noteId ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n),
      };
    }));
  }, []);

  const deleteNote = useCallback((projectId: number, noteId: number) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      return { ...p, notes: p.notes.filter(n => n.id !== noteId) };
    }));
  }, []);

  const togglePinNote = useCallback((projectId: number, noteId: number) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      return {
        ...p,
        notes: p.notes.map(n => n.id === noteId ? { ...n, pinned: !n.pinned } : n),
      };
    }));
  }, []);

  const getActiveProjects = useCallback(() => {
    return projects.filter(p => p.status === "in_progress" || p.status === "planning");
  }, [projects]);

  const getNotesForAccount = useCallback((accountId: number) => {
    return projects
      .filter(p => p.accountId === accountId)
      .flatMap(p => p.notes.map(n => ({ ...n, projectName: p.name })))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [projects]);

  return (
    <ProjectsContext.Provider value={{ projects, addProject, updateProject, addTimeEntry, addNote, updateNote, deleteNote, togglePinNote, getProject, getProjectsForAccount, getActiveProjects, getNotesForAccount }}>
      {children}
    </ProjectsContext.Provider>
  );
}

export function useProjects(): ProjectsContextValue {
  const ctx = useContext(ProjectsContext);
  if (!ctx) throw new Error("useProjects must be used within a ProjectsProvider");
  return ctx;
}
