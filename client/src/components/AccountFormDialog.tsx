/**
 * AccountFormDialog — add or edit a customer (account). Self-contained modal
 * (no dependency on the custom dialog component). Upsert: pass `account` to edit.
 */
import { useState, useEffect } from "react";
import { X } from "lucide-react";
import type { Account, CustomerType } from "@/lib/data";

const TIERS: Account["tier"][] = ["Gold", "Silver", "Bronze"];
const TYPES: CustomerType[] = ["SaaS", "Services", "Hybrid"];

const EMPTY: Omit<Account, "id"> = {
  name: "",
  platform: "",
  tier: "Silver",
  health: 80,
  arr: 0,
  stage: "Stable",
  contact: "",
  next: "",
  customerType: "SaaS",
};

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Account, "id">) => void;
  account?: Account | null; // present => edit mode
}

export default function AccountFormDialog({ open, onClose, onSubmit, account }: Props) {
  const [form, setForm] = useState<Omit<Account, "id">>(EMPTY);

  useEffect(() => {
    if (account) {
      const { id: _id, ...rest } = account;
      setForm({ ...EMPTY, ...rest });
    } else {
      setForm(EMPTY);
    }
  }, [account, open]);

  if (!open) return null;

  const set = <K extends keyof Omit<Account, "id">>(k: K, v: Omit<Account, "id">[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const submit = () => {
    if (!form.name.trim()) return;
    onSubmit(form);
    onClose();
  };

  const field = "w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40";
  const label = "text-xs font-medium text-muted-foreground mb-1 block";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h3 className="text-lg font-bold text-foreground">
            {account ? "Edit Customer" : "Add Customer"}
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className={label}>Customer name *</label>
            <input className={field} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Apex Manufacturing" />
          </div>
          <div>
            <label className={label}>Platform</label>
            <input className={field} value={form.platform} onChange={(e) => set("platform", e.target.value)} placeholder="NetSuite" />
          </div>
          <div>
            <label className={label}>Tier</label>
            <select className={field} value={form.tier} onChange={(e) => set("tier", e.target.value as Account["tier"])}>
              {TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className={label}>Customer type</label>
            <select className={field} value={form.customerType} onChange={(e) => set("customerType", e.target.value as CustomerType)}>
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className={label}>Stage</label>
            <input className={field} value={form.stage} onChange={(e) => set("stage", e.target.value)} placeholder="Expansion / Stable / At Risk" />
          </div>
          <div>
            <label className={label}>ARR (USD)</label>
            <input type="number" className={field} value={form.arr} onChange={(e) => set("arr", Number(e.target.value))} />
          </div>
          <div>
            <label className={label}>Health (0–100)</label>
            <input type="number" min={0} max={100} className={field} value={form.health} onChange={(e) => set("health", Number(e.target.value))} />
          </div>
          <div>
            <label className={label}>Primary contact</label>
            <input className={field} value={form.contact} onChange={(e) => set("contact", e.target.value)} placeholder="Dana Reyes" />
          </div>
          <div>
            <label className={label}>Next step</label>
            <input className={field} value={form.next} onChange={(e) => set("next", e.target.value)} placeholder="QBR — Apr 18" />
          </div>
        </div>

        <div className="flex justify-end gap-2 p-5 border-t border-border">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-muted-foreground hover:text-foreground">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!form.name.trim()}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground disabled:opacity-50"
          >
            {account ? "Save changes" : "Add customer"}
          </button>
        </div>
      </div>
    </div>
  );
}
