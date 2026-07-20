import { useState, useEffect } from "react";

const ACCESS_CODE = "2274";
const STORAGE_KEY = "partner_os_access_granted";

export default function PasswordGate({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored === "true") {
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code === ACCESS_CODE) {
      sessionStorage.setItem(STORAGE_KEY, "true");
      setIsAuthenticated(true);
      setError(false);
    } else {
      setError(true);
      setCode("");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-[#0a1628] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white tracking-wide">
            Partner OS <span className="text-amber-500 italic font-serif">Ai</span>
          </h1>
          <p className="text-slate-400 text-sm mt-2">Enter access code to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, "").slice(0, 4));
                setError(false);
              }}
              placeholder="••••"
              className="w-full text-center text-2xl tracking-[0.5em] bg-[#111d33] border border-slate-700 rounded-lg px-4 py-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
              autoFocus
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center">
              Invalid access code. Please try again.
            </p>
          )}

          <button
            type="submit"
            disabled={code.length !== 4}
            className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium py-3 rounded-lg transition-colors"
          >
            Access
          </button>
        </form>

        <p className="text-slate-600 text-xs text-center mt-6">
          Confidential. Unauthorized access prohibited.
        </p>
      </div>
    </div>
  );
}
