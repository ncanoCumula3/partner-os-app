/**
 * PipelineContext — Shared mutable state for pipeline deals.
 * Wraps the seed data from pipeline.ts and exposes CRUD helpers
 * so deal changes propagate immediately across all views.
 */
import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import {
  SEED_DEALS,
  DEAL_STAGES,
  getDealValue,
  type Deal,
  type DealStage,
  type DealProduct,
  type StageChange,
  type DealActivity,
  type DealContact,
  type DealNote,
  type ForecastCategory,
} from "@/lib/pipeline";

interface PipelineContextValue {
  deals: Deal[];
  addDeal: (deal: Omit<Deal, "id">) => Deal;
  updateDeal: (id: number, updates: Partial<Deal>) => void;
  deleteDeal: (id: number) => void;

  // Stage management
  changeDealStage: (dealId: number, toStage: DealStage, reason: string, notes: string, nextSteps: string, changedBy: string) => void;

  // Products
  addProduct: (dealId: number, product: Omit<DealProduct, "id">) => void;
  updateProduct: (dealId: number, productId: number, updates: Partial<DealProduct>) => void;
  removeProduct: (dealId: number, productId: number) => void;

  // Activities
  addActivity: (dealId: number, activity: Omit<DealActivity, "id">) => void;

  // Contacts
  addContact: (dealId: number, contact: Omit<DealContact, "id">) => void;
  updateContact: (dealId: number, contactId: number, updates: Partial<DealContact>) => void;
  removeContact: (dealId: number, contactId: number) => void;

  // Notes
  addNote: (dealId: number, note: Omit<DealNote, "id">) => void;
  updateNote: (dealId: number, noteId: number, updates: Partial<DealNote>) => void;
  deleteNote: (dealId: number, noteId: number) => void;
  togglePinNote: (dealId: number, noteId: number) => void;

  // Queries
  getDeal: (id: number) => Deal | undefined;
  getDealsForAccount: (accountId: number) => Deal[];
  getOpenDeals: () => Deal[];
}

const PipelineContext = createContext<PipelineContextValue | null>(null);

export function PipelineProvider({ children }: { children: ReactNode }) {
  const [deals, setDeals] = useState<Deal[]>([...SEED_DEALS]);

  const addDeal = useCallback((data: Omit<Deal, "id">): Deal => {
    const newId = Math.max(0, ...deals.map(d => d.id)) + 1;
    const deal: Deal = { ...data, id: newId };
    setDeals(prev => [...prev, deal]);
    return deal;
  }, [deals]);

  const updateDeal = useCallback((id: number, updates: Partial<Deal>) => {
    setDeals(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
  }, []);

  const deleteDeal = useCallback((id: number) => {
    setDeals(prev => prev.filter(d => d.id !== id));
  }, []);

  const changeDealStage = useCallback((
    dealId: number, toStage: DealStage, reason: string, notes: string, nextSteps: string, changedBy: string
  ) => {
    setDeals(prev => prev.map(d => {
      if (d.id !== dealId) return d;
      const stageConfig = DEAL_STAGES.find(s => s.name === toStage);
      const newProbability = stageConfig?.probability ?? d.probability;
      const newChange: StageChange = {
        id: Math.max(0, ...d.stageHistory.map(s => s.id)) + 1,
        fromStage: d.stage,
        toStage,
        changedBy,
        changedAt: new Date().toISOString().split("T")[0],
        reason,
        notes,
        nextSteps,
      };
      // Auto-set forecast category based on stage
      let forecastCategory = d.forecastCategory;
      if (toStage === "Closed Won" || toStage === "Negotiation") forecastCategory = "Commit";
      else if (toStage === "Proposal") forecastCategory = "Best Case";
      else if (toStage === "Closed Lost") forecastCategory = "Omitted";

      return {
        ...d,
        stage: toStage,
        probability: newProbability,
        forecastCategory,
        stageHistory: [...d.stageHistory, newChange],
        nextStep: nextSteps || d.nextStep,
        closedDate: (toStage === "Closed Won" || toStage === "Closed Lost") ? new Date().toISOString().split("T")[0] : d.closedDate,
      };
    }));
  }, []);

  // Products
  const addProduct = useCallback((dealId: number, product: Omit<DealProduct, "id">) => {
    setDeals(prev => prev.map(d => {
      if (d.id !== dealId) return d;
      const newId = Math.max(0, ...d.products.map(p => p.id)) + 1;
      const newProducts = [...d.products, { ...product, id: newId }];
      return { ...d, products: newProducts, value: getDealValue(newProducts) };
    }));
  }, []);

  const updateProduct = useCallback((dealId: number, productId: number, updates: Partial<DealProduct>) => {
    setDeals(prev => prev.map(d => {
      if (d.id !== dealId) return d;
      const newProducts = d.products.map(p => p.id === productId ? { ...p, ...updates } : p);
      return { ...d, products: newProducts, value: getDealValue(newProducts) };
    }));
  }, []);

  const removeProduct = useCallback((dealId: number, productId: number) => {
    setDeals(prev => prev.map(d => {
      if (d.id !== dealId) return d;
      const newProducts = d.products.map(p => p.id === productId ? { ...p, status: "Removed" as const } : p);
      return { ...d, products: newProducts, value: getDealValue(newProducts) };
    }));
  }, []);

  // Activities
  const addActivity = useCallback((dealId: number, activity: Omit<DealActivity, "id">) => {
    setDeals(prev => prev.map(d => {
      if (d.id !== dealId) return d;
      const newId = Math.max(0, ...d.activities.map(a => a.id)) + 1;
      return { ...d, activities: [{ ...activity, id: newId }, ...d.activities] };
    }));
  }, []);

  // Contacts
  const addContact = useCallback((dealId: number, contact: Omit<DealContact, "id">) => {
    setDeals(prev => prev.map(d => {
      if (d.id !== dealId) return d;
      const newId = Math.max(0, ...d.contacts.map(c => c.id)) + 1;
      return { ...d, contacts: [...d.contacts, { ...contact, id: newId }] };
    }));
  }, []);

  const updateContact = useCallback((dealId: number, contactId: number, updates: Partial<DealContact>) => {
    setDeals(prev => prev.map(d => {
      if (d.id !== dealId) return d;
      return { ...d, contacts: d.contacts.map(c => c.id === contactId ? { ...c, ...updates } : c) };
    }));
  }, []);

  const removeContact = useCallback((dealId: number, contactId: number) => {
    setDeals(prev => prev.map(d => {
      if (d.id !== dealId) return d;
      return { ...d, contacts: d.contacts.filter(c => c.id !== contactId) };
    }));
  }, []);

  // Notes
  const addNote = useCallback((dealId: number, note: Omit<DealNote, "id">) => {
    setDeals(prev => prev.map(d => {
      if (d.id !== dealId) return d;
      const newId = Math.max(0, ...d.notes.map(n => n.id)) + 1;
      return { ...d, notes: [{ ...note, id: newId }, ...d.notes] };
    }));
  }, []);

  const updateNote = useCallback((dealId: number, noteId: number, updates: Partial<DealNote>) => {
    setDeals(prev => prev.map(d => {
      if (d.id !== dealId) return d;
      return { ...d, notes: d.notes.map(n => n.id === noteId ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n) };
    }));
  }, []);

  const deleteNote = useCallback((dealId: number, noteId: number) => {
    setDeals(prev => prev.map(d => {
      if (d.id !== dealId) return d;
      return { ...d, notes: d.notes.filter(n => n.id !== noteId) };
    }));
  }, []);

  const togglePinNote = useCallback((dealId: number, noteId: number) => {
    setDeals(prev => prev.map(d => {
      if (d.id !== dealId) return d;
      return { ...d, notes: d.notes.map(n => n.id === noteId ? { ...n, isPinned: !n.isPinned } : n) };
    }));
  }, []);

  // Queries
  const getDeal = useCallback((id: number) => deals.find(d => d.id === id), [deals]);
  const getDealsForAccount = useCallback((accountId: number) => deals.filter(d => d.accountId === accountId), [deals]);
  const getOpenDeals = useCallback(() => deals.filter(d => d.stage !== "Closed Won" && d.stage !== "Closed Lost"), [deals]);

  return (
    <PipelineContext.Provider value={{
      deals, addDeal, updateDeal, deleteDeal, changeDealStage,
      addProduct, updateProduct, removeProduct,
      addActivity, addContact, updateContact, removeContact,
      addNote, updateNote, deleteNote, togglePinNote,
      getDeal, getDealsForAccount, getOpenDeals,
    }}>
      {children}
    </PipelineContext.Provider>
  );
}

export function usePipeline() {
  const ctx = useContext(PipelineContext);
  if (!ctx) throw new Error("usePipeline must be used within PipelineProvider");
  return ctx;
}
