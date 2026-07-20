/**
 * AccountsContext — customers (accounts), backed by the custom API.
 * Loads from GET /api/accounts (seeds the DB from bundled ACCOUNTS on first
 * run) and persists every add/update. This is what powers "add new customer".
 */
import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { api } from "@/lib/api";
import { ACCOUNTS as SEED_ACCOUNTS, type Account } from "@/lib/data";

interface AccountsContextValue {
  accounts: Account[];
  addAccount: (account: Omit<Account, "id">) => Account;
  updateAccount: (id: number, updates: Partial<Account>) => void;
  deleteAccount: (id: number) => void;
  getAccount: (id: number) => Account | undefined;
}

const AccountsContext = createContext<AccountsContextValue | null>(null);

export function AccountsProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<Account[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let list = await api.get<Account[]>("/api/accounts");
        if (!list.length) {
          list = await Promise.all(SEED_ACCOUNTS.map((a) => api.post<Account>("/api/accounts", a)));
        }
        if (!cancelled) setAccounts(list);
      } catch {
        if (!cancelled) setAccounts([...SEED_ACCOUNTS]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const addAccount = useCallback((data: Omit<Account, "id">): Account => {
    const temp: Account = { ...(data as Account), id: -Date.now() };
    setAccounts((prev) => [temp, ...prev]);
    api
      .post<Account>("/api/accounts", data)
      .then((saved) => setAccounts((prev) => prev.map((a) => (a.id === temp.id ? saved : a))))
      .catch(() => {});
    return temp;
  }, []);

  const updateAccount = useCallback((id: number, updates: Partial<Account>) => {
    setAccounts((prev) =>
      prev.map((a) => {
        if (a.id !== id) return a;
        const next = { ...a, ...updates };
        void api.patch(`/api/accounts/${id}`, next).catch(() => {});
        return next;
      }),
    );
  }, []);

  const deleteAccount = useCallback((id: number) => {
    setAccounts((prev) => prev.filter((a) => a.id !== id));
    void api.del(`/api/accounts/${id}`).catch(() => {});
  }, []);

  const getAccount = useCallback((id: number) => accounts.find((a) => a.id === id), [accounts]);

  return (
    <AccountsContext.Provider value={{ accounts, addAccount, updateAccount, deleteAccount, getAccount }}>
      {children}
    </AccountsContext.Provider>
  );
}

export function useAccounts(): AccountsContextValue {
  const ctx = useContext(AccountsContext);
  if (!ctx) throw new Error("useAccounts must be used within an AccountsProvider");
  return ctx;
}
