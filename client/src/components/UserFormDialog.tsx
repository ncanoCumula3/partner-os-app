/**
 * UserFormDialog — add or edit a team member. Upsert: pass `user` to edit.
 * Role is one of the three access levels: Admin / Account Manager / Supervisor.
 */
import { useState, useEffect } from "react";
import { X } from "lucide-react";
import {
  USER_ROLES, USER_STATUSES, ROLE_PERMISSIONS,
  type User, type UserRole, type UserStatus,
} from "@/lib/users";

const EMPTY: Omit<User, "id"> = {
  name: "",
  email: "",
  role: "Account Manager",
  status: "invited",
  title: "",
  phone: "",
};

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<User, "id">) => void;
  user?: User | null; // present => edit mode
}

export default function UserFormDialog({ open, onClose, onSubmit, user }: Props) {
  const [form, setForm] = useState<Omit<User, "id">>(EMPTY);

  useEffect(() => {
    if (user) {
      const { id: _id, ...rest } = user;
      setForm({ ...EMPTY, ...rest });
    } else {
      setForm(EMPTY);
    }
  }, [user, open]);

  if (!open) return null;

  const set = <K extends keyof Omit<User, "id">>(k: K, v: Omit<User, "id">[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const validEmail = /.+@.+\..+/.test(form.email);
  const submit = () => {
    if (!form.name.trim() || !validEmail) return;
    onSubmit(form);
    onClose();
  };

  const field = "w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40";
  const label = "text-xs font-medium text-muted-foreground mb-1 block";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h3 className="text-lg font-bold text-foreground">{user ? "Edit User" : "Add User"}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className={label}>Full name *</label>
            <input className={field} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Dana Reyes" />
          </div>
          <div className="col-span-2">
            <label className={label}>Email *</label>
            <input className={field} value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="dana.reyes@partneros.ai" />
          </div>
          <div>
            <label className={label}>Access level (role)</label>
            <select className={field} value={form.role} onChange={(e) => set("role", e.target.value as UserRole)}>
              {USER_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className={label}>Status</label>
            <select className={field} value={form.status} onChange={(e) => set("status", e.target.value as UserStatus)}>
              {USER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className={label}>Job title</label>
            <input className={field} value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Account Manager" />
          </div>
          <div>
            <label className={label}>Phone</label>
            <input className={field} value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+1 415 555 0100" />
          </div>

          <div className="col-span-2 rounded-lg bg-muted/30 border border-border/50 p-3">
            <p className="text-[11px] font-semibold text-muted-foreground mb-1.5">{form.role} can:</p>
            <div className="flex flex-wrap gap-1.5">
              {ROLE_PERMISSIONS[form.role].map((p) => (
                <span key={p} className="text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary font-medium">{p}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 p-5 border-t border-border">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-muted-foreground hover:text-foreground">Cancel</button>
          <button
            onClick={submit}
            disabled={!form.name.trim() || !validEmail}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground disabled:opacity-50"
          >
            {user ? "Save changes" : "Add user"}
          </button>
        </div>
      </div>
    </div>
  );
}
