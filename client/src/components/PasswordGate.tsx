import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Login gate. Primary path is per-user email + password (verified server-side
 * against hashed credentials). A collapsible fallback keeps the legacy shared
 * 4-digit access code (2274) working for the demo.
 */
export default function PasswordGate({ children }: { children: React.ReactNode }) {
  const { authenticated, ready, login, loginWithCode } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [showCode, setShowCode] = useState(false);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    const res = await login(email.trim(), password);
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error || "Invalid email or password");
      setPassword("");
    }
  };

  const handleCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginWithCode(code)) {
      setCodeError(true);
      setCode("");
    }
  };

  if (ready && authenticated) return <>{children}</>;

  if (!ready) {
    return (
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a1628] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white tracking-wide">
            Partner OS <span className="text-amber-500 italic font-serif">Ai</span>
          </h1>
          <p className="text-slate-400 text-sm mt-2">Sign in to continue</p>
        </div>

        {!showCode ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                placeholder="you@partneros.io"
                autoFocus
                className="w-full bg-[#111d33] border border-slate-700 rounded-lg px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                placeholder="••••••••"
                className="w-full bg-[#111d33] border border-slate-700 rounded-lg px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
              />
            </div>

            {error && <p className="text-red-400 text-sm text-center">{error}</p>}

            <button
              type="submit"
              disabled={submitting || !email || !password}
              className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center"
            >
              {submitting ? <span className="w-4 h-4 border-2 border-white/60 border-t-transparent rounded-full animate-spin" /> : "Sign in"}
            </button>

            <button
              type="button"
              onClick={() => { setShowCode(true); setError(""); }}
              className="w-full text-slate-500 hover:text-slate-300 text-xs transition-colors"
            >
              Use access code instead
            </button>
          </form>
        ) : (
          <form onSubmit={handleCode} className="space-y-4">
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={code}
              onChange={(e) => { setCode(e.target.value.replace(/\D/g, "").slice(0, 4)); setCodeError(false); }}
              placeholder="••••"
              autoFocus
              className="w-full text-center text-2xl tracking-[0.5em] bg-[#111d33] border border-slate-700 rounded-lg px-4 py-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
            />
            {codeError && <p className="text-red-400 text-sm text-center">Invalid access code. Please try again.</p>}
            <button
              type="submit"
              disabled={code.length !== 4}
              className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium py-3 rounded-lg transition-colors"
            >
              Access
            </button>
            <button
              type="button"
              onClick={() => { setShowCode(false); setCodeError(false); }}
              className="w-full text-slate-500 hover:text-slate-300 text-xs transition-colors"
            >
              Back to email sign-in
            </button>
          </form>
        )}

        <p className="text-slate-600 text-xs text-center mt-6">
          Confidential. Unauthorized access prohibited.
        </p>
      </div>
    </div>
  );
}
