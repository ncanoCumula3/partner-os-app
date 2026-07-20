/**
 * RecordFormDialog — a schema-driven add/edit modal reused across the editable
 * views. Pass a list of field descriptors; it renders the inputs, seeds from an
 * existing record (edit) or blanks (add), and returns the assembled record.
 *
 * Supported field types: text, number, textarea, select, and "list" (a simple
 * string[] edited as newline-separated lines — for tags, steps, tips, etc).
 */
import { useState, useEffect } from "react";
import { X } from "lucide-react";

export type FieldType = "text" | "number" | "textarea" | "select" | "list";

export interface FieldSpec {
  key: string;
  label: string;
  type?: FieldType;          // default "text"
  options?: string[];        // for select
  required?: boolean;
  placeholder?: string;
  full?: boolean;            // span both columns
}

interface Props<T> {
  open: boolean;
  title: string;
  fields: FieldSpec[];
  record?: T | null;          // present => edit mode
  defaults?: Partial<T>;      // applied to new records
  onClose: () => void;
  onSubmit: (data: T) => void;
}

export default function RecordFormDialog<T extends object>({
  open, title, fields, record, defaults, onClose, onSubmit,
}: Props<T>) {
  const blank = () => {
    const o: Record<string, unknown> = { ...(defaults as object) };
    for (const f of fields) {
      if (o[f.key] !== undefined) continue;
      o[f.key] = f.type === "number" ? 0 : f.type === "list" ? [] : f.type === "select" ? (f.options?.[0] ?? "") : "";
    }
    return o;
  };

  const [form, setForm] = useState<Record<string, unknown>>(blank);

  useEffect(() => {
    if (record) setForm({ ...blank(), ...(record as object) });
    else setForm(blank());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record, open]);

  if (!open) return null;

  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const requiredMissing = fields.some((f) => f.required && !String(form[f.key] ?? "").trim());

  const submit = () => {
    if (requiredMissing) return;
    // coerce numbers
    const out: Record<string, unknown> = { ...form };
    for (const f of fields) {
      if (f.type === "number") out[f.key] = Number(out[f.key]) || 0;
    }
    onSubmit(out as T);
    onClose();
  };

  const field = "w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40";
  const label = "text-xs font-medium text-muted-foreground mb-1 block";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h3 className="text-lg font-bold text-foreground">{title}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 grid grid-cols-2 gap-4">
          {fields.map((f) => {
            const t = f.type ?? "text";
            const val = form[f.key];
            const span = f.full || t === "textarea" || t === "list" ? "col-span-2" : "";
            return (
              <div key={f.key} className={span}>
                <label className={label}>{f.label}{f.required ? " *" : ""}</label>
                {t === "select" ? (
                  <select className={field} value={String(val ?? "")} onChange={(e) => set(f.key, e.target.value)}>
                    {(f.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : t === "textarea" ? (
                  <textarea className={field} rows={3} value={String(val ?? "")} placeholder={f.placeholder} onChange={(e) => set(f.key, e.target.value)} />
                ) : t === "list" ? (
                  <textarea
                    className={field}
                    rows={3}
                    value={Array.isArray(val) ? (val as string[]).join("\n") : String(val ?? "")}
                    placeholder={f.placeholder ?? "One per line"}
                    onChange={(e) => set(f.key, e.target.value.split("\n").map((s) => s.trim()).filter(Boolean))}
                  />
                ) : (
                  <input
                    type={t === "number" ? "number" : "text"}
                    className={field}
                    value={val === undefined || val === null ? "" : String(val)}
                    placeholder={f.placeholder}
                    onChange={(e) => set(f.key, e.target.value)}
                  />
                )}
              </div>
            );
          })}
        </div>

        <div className="flex justify-end gap-2 p-5 border-t border-border">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-muted-foreground hover:text-foreground">Cancel</button>
          <button onClick={submit} disabled={requiredMissing} className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground disabled:opacity-50">
            {record ? "Save changes" : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}
