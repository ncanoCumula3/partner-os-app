/**
 * ProjectsContext — service projects, backed by the custom API.
 * Loads from GET /api/projects (seeds the DB from bundled data on first run),
 * and persists every mutation via POST/PATCH. The whole project is stored as
 * one JSONB row, so any nested change (tasks, notes, time entries) is saved by
 * PATCHing the updated project.
 */
import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { api } from "@/lib/api";
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
  const [projects, setProjects] = useState<ServiceProject[]>([]);

  // Load from the API; seed the DB from bundled data if it's empty.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let list = await api.get<ServiceProject[]>("/api/projects");
        if (!list.length) {
          list = await Promise.all(
            SEED_PROJECTS.map((p) => api.post<ServiceProject>("/api/projects", p)),
          );
        }
        if (!cancelled) setProjects(list);
      } catch {
        if (!cancelled) setProjects([...SEED_PROJECTS]); // offline fallback
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Apply a transform to one project, update state, and persist the whole project.
  const mutateProject = useCallback(
    (projectId: number, transform: (p: ServiceProject) => ServiceProject) => {
      setProjects((prev) =>
        prev.map((p) => {
          if (p.id !== projectId) return p;
          const updated = transform(p);
          void api.patch(`/api/projects/${projectId}`, updated).catch(() => {});
          return updated;
        }),
      );
    },
    [],
  );

  const addProject = useCallback((data: Omit<ServiceProject, "id">): ServiceProject => {
    const temp: ServiceProject = { ...(data as ServiceProject), id: -Date.now() };
    setProjects((prev) => [...prev, temp]);
    api
      .post<ServiceProject>("/api/projects", data)
      .then((saved) => setProjects((prev) => prev.map((p) => (p.id === temp.id ? saved : p))))
      .catch(() => {});
    return temp;
  }, []);

  const updateProject = useCallback(
    (id: number, updates: Partial<ServiceProject>) => {
      mutateProject(id, (p) => ({ ...p, ...updates }));
    },
    [mutateProject],
  );

  const addTimeEntry = useCallback(
    (projectId: number, entry: Omit<TimeEntry, "id">) => {
      mutateProject(projectId, (p) => {
        const newId = Math.max(0, ...p.timeEntries.map((te) => te.id)) + 1;
        const newEntry: TimeEntry = { ...entry, id: newId };
        const updatedTasks = p.tasks.map((t) =>
          t.id === entry.taskId ? { ...t, hoursLogged: t.hoursLogged + entry.hours } : t,
        );
        const newHoursLogged = p.hoursLogged + entry.hours;
        const hourlyRate = p.hourlyRate || (p.hoursEstimated > 0 ? p.contractValue / p.hoursEstimated : 0);
        const newBudgetConsumed = p.budgetConsumed + entry.hours * hourlyRate;
        return {
          ...p,
          timeEntries: [...p.timeEntries, newEntry],
          tasks: updatedTasks,
          hoursLogged: newHoursLogged,
          budgetConsumed: Math.round(newBudgetConsumed),
        };
      });
    },
    [mutateProject],
  );

  const addNote = useCallback(
    (projectId: number, note: Omit<ProjectNote, "id">) => {
      mutateProject(projectId, (p) => {
        const newId = Math.max(0, ...p.notes.map((n) => n.id)) + 1;
        const newNote: ProjectNote = { ...note, id: newId };
        return { ...p, notes: [newNote, ...p.notes] };
      });
    },
    [mutateProject],
  );

  const updateNote = useCallback(
    (projectId: number, noteId: number, updates: Partial<ProjectNote>) => {
      mutateProject(projectId, (p) => ({
        ...p,
        notes: p.notes.map((n) =>
          n.id === noteId ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n,
        ),
      }));
    },
    [mutateProject],
  );

  const deleteNote = useCallback(
    (projectId: number, noteId: number) => {
      mutateProject(projectId, (p) => ({ ...p, notes: p.notes.filter((n) => n.id !== noteId) }));
    },
    [mutateProject],
  );

  const togglePinNote = useCallback(
    (projectId: number, noteId: number) => {
      mutateProject(projectId, (p) => ({
        ...p,
        notes: p.notes.map((n) => (n.id === noteId ? { ...n, pinned: !n.pinned } : n)),
      }));
    },
    [mutateProject],
  );

  const getProject = useCallback((id: number) => projects.find((p) => p.id === id), [projects]);
  const getProjectsForAccount = useCallback(
    (accountId: number) => projects.filter((p) => p.accountId === accountId),
    [projects],
  );
  const getActiveProjects = useCallback(
    () => projects.filter((p) => p.status === "in_progress" || p.status === "planning"),
    [projects],
  );
  const getNotesForAccount = useCallback(
    (accountId: number) =>
      projects
        .filter((p) => p.accountId === accountId)
        .flatMap((p) => p.notes.map((n) => ({ ...n, projectName: p.name })))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [projects],
  );

  return (
    <ProjectsContext.Provider
      value={{
        projects,
        addProject,
        updateProject,
        addTimeEntry,
        addNote,
        updateNote,
        deleteNote,
        togglePinNote,
        getProject,
        getProjectsForAccount,
        getActiveProjects,
        getNotesForAccount,
      }}
    >
      {children}
    </ProjectsContext.Provider>
  );
}

export function useProjects(): ProjectsContextValue {
  const ctx = useContext(ProjectsContext);
  if (!ctx) throw new Error("useProjects must be used within a ProjectsProvider");
  return ctx;
}
