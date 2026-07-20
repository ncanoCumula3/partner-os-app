/**
 * User records for team management. Distinct from AdminSettings role
 * *definitions* — these are the actual people, each assigned an access level.
 * The three access levels the business uses: Admin, Account Manager, Supervisor.
 */
export type UserRole = "Admin" | "Account Manager" | "Supervisor";
export type UserStatus = "active" | "invited" | "suspended";

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  title: string;
  phone: string;
  /** Write-only: sent to the API to (re)set a login password; never returned. */
  password?: string;
}

export const USER_ROLES: UserRole[] = ["Admin", "Account Manager", "Supervisor"];
export const USER_STATUSES: UserStatus[] = ["active", "invited", "suspended"];

/** What each access level can do — surfaced in the UI so it's clear. */
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  Admin: ["Full access", "Manage users", "Manage settings", "All accounts & pipeline"],
  "Account Manager": ["Own accounts & pipeline", "Renewals & downsell", "Reporting"],
  Supervisor: ["Team oversight", "Approve escalations", "Read-all", "Reporting"],
};

export const roleBadgeColor: Record<UserRole, { bg: string; text: string }> = {
  Admin: { bg: "bg-red-500/10", text: "text-red-600" },
  "Account Manager": { bg: "bg-blue-500/10", text: "text-blue-600" },
  Supervisor: { bg: "bg-amber-500/10", text: "text-amber-600" },
};

export const statusBadgeColor: Record<UserStatus, { bg: string; text: string }> = {
  active: { bg: "bg-emerald-500/10", text: "text-emerald-600" },
  invited: { bg: "bg-slate-500/10", text: "text-slate-500" },
  suspended: { bg: "bg-red-500/10", text: "text-red-600" },
};

export const USERS: User[] = [
  { id: 1, name: "Jordan Davis", email: "jordan.davis@partneros.ai", role: "Admin", status: "active", title: "Head of Customer Success", phone: "+1 415 555 0110" },
  { id: 2, name: "Dana Reyes", email: "dana.reyes@partneros.ai", role: "Account Manager", status: "active", title: "Senior Account Manager", phone: "+1 415 555 0122" },
  { id: 3, name: "Sam Whitfield", email: "sam.whitfield@partneros.ai", role: "Account Manager", status: "active", title: "Account Manager", phone: "+1 415 555 0134" },
  { id: 4, name: "Priya Nair", email: "priya.nair@partneros.ai", role: "Supervisor", status: "active", title: "CS Team Supervisor", phone: "+1 415 555 0146" },
  { id: 5, name: "Alex Chen", email: "alex.chen@partneros.ai", role: "Account Manager", status: "invited", title: "Account Manager", phone: "" },
];
