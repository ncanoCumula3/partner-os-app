/**
 * useCollection — generic client hook backing an editable view with the custom
 * collections API. Loads GET /api/collections/:name, seeds the DB from the
 * bundled seed array on first run, and persists every upsert/delete.
 *
 *   const { items, upsert, remove, loaded } =
 *     useCollection<Ticket>("tickets", TICKETS, (t) => t.id);
 *
 * `getId` returns the stable string key for an item (its natural id/title/etc).
 */
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

export function useCollection<T extends object>(
  name: string,
  seed: T[],
  getId: (item: T) => string | number,
) {
  const [items, setItems] = useState<T[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let list = await api.get<T[]>(`/api/collections/${name}`);
        if (!list.length && seed.length) {
          list = await api.post<T[]>(`/api/collections/${name}/bulk`, seed.map((s) => ({ ...s, id: getId(s) })));
        }
        if (!cancelled) { setItems(list); setLoaded(true); }
      } catch {
        if (!cancelled) { setItems([...seed]); setLoaded(true); }
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);

  /**
   * Create or update one item (keyed by getId). Optimistic + persisted.
   * Pass `prevId` when editing so a changed natural key removes the old row.
   */
  const upsert = useCallback((item: T, prevId?: string | number) => {
    const id = String(getId(item));
    const payload = { ...item, id } as T;
    if (prevId !== undefined && String(prevId) !== id) {
      void api.del(`/api/collections/${name}/${encodeURIComponent(String(prevId))}`).catch(() => {});
    }
    setItems((prev) => {
      const filtered = prevId !== undefined ? prev.filter((p) => String(getId(p)) !== String(prevId)) : prev;
      const idx = filtered.findIndex((p) => String(getId(p)) === id);
      if (idx === -1) return [payload, ...filtered];
      const copy = [...filtered];
      copy[idx] = payload;
      return copy;
    });
    void api.put(`/api/collections/${name}/${encodeURIComponent(id)}`, payload).catch(() => {});
    return payload;
  }, [name, getId]);

  /** Delete one item by its id. */
  const remove = useCallback((id: string | number) => {
    const key = String(id);
    setItems((prev) => prev.filter((p) => String(getId(p)) !== key));
    void api.del(`/api/collections/${name}/${encodeURIComponent(key)}`).catch(() => {});
  }, [name, getId]);

  return { items, upsert, remove, loaded };
}
