/**
 * PipelineContext — pipeline deals, backed by the custom API.
 * Loads from GET /api/deals (seeds the DB from bundled data on first run) and
 * persists every mutation via POST/PATCH/DELETE. The whole deal (contacts,
 * products, activities, notes, stage history) is stored as one JSONB row.
 */
import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { api } from "@/lib/api";
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
} from "@/lib/pipeline";

interface PipelineContextValue {
  deals: Deal[];
  addDeal: (deal: Omit<Deal, "id">) => Deal;
  updateDeal: (id: number, updates: Partial<Deal>) => void;
  deleteDeal: (id: number) => void;
  changeDealStage: (dealId: number, toStage: DealStage, reason: string, notes: string, nextSteps: string, changedBy: string) => void;
  addProduct: (dealId: number, product: Omit<DealProduct, "id">) => void;
  updateProduct: (dealId: number, productId: number, updates: Partial<DealProduct>) => void;
  removeProduct: (dealId: number, productId: number) => void;
  addActivity: (dealId: number, activity: Omit<DealActivity, "id">) => void;
  addContact: (dealId: number, contact: Omit<DealContact, "id">) => void;
  updateContact: (dealId: number, contactId: number, updates: Partial<DealContact>) => void;
  removeContact: (dealId: number, contactId: number) => void;
  addNote: (dealId: number, note: Omit<DealNote, "id">) => void;
  updateNote: (dealId: number, noteId: number, updates: Partial<DealNote>) => void;
  deleteNote: (dealId: number, noteId: number) => void;
  togglePinNote: (dealId: number, noteId: number) => void;
  getDeal: (id: number) => Deal | undefined;
  getDealsForAccount: (accountId: number) => Deal[];
  getOpenDeals: () => Deal[];
}

const PipelineContext = createContext<PipelineContextValue | null>(null);

export function PipelineProvider({ children }: { children: ReactNode }) {
  const [deals, setDeals] = useState<Deal[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let list = await api.get<Deal[]>("/api/deals");
        if (!list.length) {
          list = await Promise.all(SEED_DEALS.map((d) => api.post<Deal>("/api/deals", d)));
        }
        if (!cancelled) setDeals(list);
      } catch {
        if (!cancelled) setDeals([...SEED_DEALS]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // transform one deal, update state, persist the whole deal
  const mutateDeal = useCallback((dealId: number, transform: (d: Deal) => Deal) => {
    setDeals((prev) =>
      prev.map((d) => {
        if (d.id !== dealId) return d;
        const updated = transform(d);
        void api.patch(`/api/deals/${dealId}`, updated).catch(() => {});
        return updated;
      }),
    );
  }, []);

  const addDeal = useCallback((data: Omit<Deal, "id">): Deal => {
    const temp: Deal = { ...(data as Deal), id: -Date.now() };
    setDeals((prev) => [...prev, temp]);
    api
      .post<Deal>("/api/deals", data)
      .then((saved) => setDeals((prev) => prev.map((d) => (d.id === temp.id ? saved : d))))
      .catch(() => {});
    return temp;
  }, []);

  const updateDeal = useCallback(
    (id: number, updates: Partial<Deal>) => mutateDeal(id, (d) => ({ ...d, ...updates })),
    [mutateDeal],
  );

  const deleteDeal = useCallback((id: number) => {
    setDeals((prev) => prev.filter((d) => d.id !== id));
    void api.del(`/api/deals/${id}`).catch(() => {});
  }, []);

  const changeDealStage = useCallback(
    (dealId: number, toStage: DealStage, reason: string, notes: string, nextSteps: string, changedBy: string) => {
      mutateDeal(dealId, (d) => {
        const stageConfig = DEAL_STAGES.find((s) => s.name === toStage);
        const newProbability = stageConfig?.probability ?? d.probability;
        const newChange: StageChange = {
          id: Math.max(0, ...d.stageHistory.map((s) => s.id)) + 1,
          fromStage: d.stage,
          toStage,
          changedBy,
          changedAt: new Date().toISOString().split("T")[0],
          reason,
          notes,
          nextSteps,
        };
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
          closedDate:
            toStage === "Closed Won" || toStage === "Closed Lost"
              ? new Date().toISOString().split("T")[0]
              : d.closedDate,
        };
      });
    },
    [mutateDeal],
  );

  const addProduct = useCallback(
    (dealId: number, product: Omit<DealProduct, "id">) => {
      mutateDeal(dealId, (d) => {
        const newId = Math.max(0, ...d.products.map((p) => p.id)) + 1;
        const newProducts = [...d.products, { ...product, id: newId }];
        return { ...d, products: newProducts, value: getDealValue(newProducts) };
      });
    },
    [mutateDeal],
  );

  const updateProduct = useCallback(
    (dealId: number, productId: number, updates: Partial<DealProduct>) => {
      mutateDeal(dealId, (d) => {
        const newProducts = d.products.map((p) => (p.id === productId ? { ...p, ...updates } : p));
        return { ...d, products: newProducts, value: getDealValue(newProducts) };
      });
    },
    [mutateDeal],
  );

  const removeProduct = useCallback(
    (dealId: number, productId: number) => {
      mutateDeal(dealId, (d) => {
        const newProducts = d.products.map((p) =>
          p.id === productId ? { ...p, status: "Removed" as const } : p,
        );
        return { ...d, products: newProducts, value: getDealValue(newProducts) };
      });
    },
    [mutateDeal],
  );

  const addActivity = useCallback(
    (dealId: number, activity: Omit<DealActivity, "id">) => {
      mutateDeal(dealId, (d) => {
        const newId = Math.max(0, ...d.activities.map((a) => a.id)) + 1;
        return { ...d, activities: [{ ...activity, id: newId }, ...d.activities] };
      });
    },
    [mutateDeal],
  );

  const addContact = useCallback(
    (dealId: number, contact: Omit<DealContact, "id">) => {
      mutateDeal(dealId, (d) => {
        const newId = Math.max(0, ...d.contacts.map((c) => c.id)) + 1;
        return { ...d, contacts: [...d.contacts, { ...contact, id: newId }] };
      });
    },
    [mutateDeal],
  );

  const updateContact = useCallback(
    (dealId: number, contactId: number, updates: Partial<DealContact>) => {
      mutateDeal(dealId, (d) => ({
        ...d,
        contacts: d.contacts.map((c) => (c.id === contactId ? { ...c, ...updates } : c)),
      }));
    },
    [mutateDeal],
  );

  const removeContact = useCallback(
    (dealId: number, contactId: number) => {
      mutateDeal(dealId, (d) => ({ ...d, contacts: d.contacts.filter((c) => c.id !== contactId) }));
    },
    [mutateDeal],
  );

  const addNote = useCallback(
    (dealId: number, note: Omit<DealNote, "id">) => {
      mutateDeal(dealId, (d) => {
        const newId = Math.max(0, ...d.notes.map((n) => n.id)) + 1;
        return { ...d, notes: [{ ...note, id: newId }, ...d.notes] };
      });
    },
    [mutateDeal],
  );

  const updateNote = useCallback(
    (dealId: number, noteId: number, updates: Partial<DealNote>) => {
      mutateDeal(dealId, (d) => ({
        ...d,
        notes: d.notes.map((n) =>
          n.id === noteId ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n,
        ),
      }));
    },
    [mutateDeal],
  );

  const deleteNote = useCallback(
    (dealId: number, noteId: number) => {
      mutateDeal(dealId, (d) => ({ ...d, notes: d.notes.filter((n) => n.id !== noteId) }));
    },
    [mutateDeal],
  );

  const togglePinNote = useCallback(
    (dealId: number, noteId: number) => {
      mutateDeal(dealId, (d) => ({
        ...d,
        notes: d.notes.map((n) => (n.id === noteId ? { ...n, isPinned: !n.isPinned } : n)),
      }));
    },
    [mutateDeal],
  );

  const getDeal = useCallback((id: number) => deals.find((d) => d.id === id), [deals]);
  const getDealsForAccount = useCallback(
    (accountId: number) => deals.filter((d) => d.accountId === accountId),
    [deals],
  );
  const getOpenDeals = useCallback(
    () => deals.filter((d) => d.stage !== "Closed Won" && d.stage !== "Closed Lost"),
    [deals],
  );

  return (
    <PipelineContext.Provider
      value={{
        deals,
        addDeal,
        updateDeal,
        deleteDeal,
        changeDealStage,
        addProduct,
        updateProduct,
        removeProduct,
        addActivity,
        addContact,
        updateContact,
        removeContact,
        addNote,
        updateNote,
        deleteNote,
        togglePinNote,
        getDeal,
        getDealsForAccount,
        getOpenDeals,
      }}
    >
      {children}
    </PipelineContext.Provider>
  );
}

export function usePipeline() {
  const ctx = useContext(PipelineContext);
  if (!ctx) throw new Error("usePipeline must be used within PipelineProvider");
  return ctx;
}
