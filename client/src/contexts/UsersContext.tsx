/**
 * UsersContext — team member / user records, backed by the custom API.
 * Loads from GET /api/users (seeds the DB from bundled USERS on first run)
 * and persists every add/update/delete. Powers user management + role levels.
 */
import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { api } from "@/lib/api";
import { USERS as SEED_USERS, type User } from "@/lib/users";

interface UsersContextValue {
  users: User[];
  addUser: (user: Omit<User, "id">) => User;
  updateUser: (id: number, updates: Partial<User>) => void;
  deleteUser: (id: number) => void;
  getUser: (id: number) => User | undefined;
}

const UsersContext = createContext<UsersContextValue | null>(null);

export function UsersProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let list = await api.get<User[]>("/api/users");
        if (!list.length) {
          list = await Promise.all(SEED_USERS.map((u) => api.post<User>("/api/users", u)));
        }
        if (!cancelled) setUsers(list);
      } catch {
        if (!cancelled) setUsers([...SEED_USERS]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const addUser = useCallback((data: Omit<User, "id">): User => {
    const temp: User = { ...(data as User), id: -Date.now() };
    setUsers((prev) => [temp, ...prev]);
    api
      .post<User>("/api/users", data)
      .then((saved) => setUsers((prev) => prev.map((u) => (u.id === temp.id ? saved : u))))
      .catch(() => {});
    return temp;
  }, []);

  const updateUser = useCallback((id: number, updates: Partial<User>) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== id) return u;
        const next = { ...u, ...updates };
        void api.patch(`/api/users/${id}`, next).catch(() => {});
        return next;
      }),
    );
  }, []);

  const deleteUser = useCallback((id: number) => {
    setUsers((prev) => prev.filter((u) => u.id !== id));
    void api.del(`/api/users/${id}`).catch(() => {});
  }, []);

  const getUser = useCallback((id: number) => users.find((u) => u.id === id), [users]);

  return (
    <UsersContext.Provider value={{ users, addUser, updateUser, deleteUser, getUser }}>
      {children}
    </UsersContext.Provider>
  );
}

export function useUsers(): UsersContextValue {
  const ctx = useContext(UsersContext);
  if (!ctx) throw new Error("useUsers must be used within a UsersProvider");
  return ctx;
}
