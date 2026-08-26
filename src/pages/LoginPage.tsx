import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { api, getErrorMessage } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { AuthBackground } from "../components/AuthBackground";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Two ways to end up here with somewhere to go afterwards: a protected page
  // bounced us (state.from), or a link asked for a destination (?next=), as
  // family invites do. The search string matters for those, so it's kept.
  const fromState = location.state as { from?: { pathname?: string; search?: string } } | null;
  const nextParam = new URLSearchParams(location.search).get("next");
  // Only in-app paths, so a crafted link can't bounce anyone off-site.
  const safeNext = nextParam?.startsWith("/") && !nextParam.startsWith("//") ? nextParam : null;
  const redirectTo =
    safeNext ??
    (fromState?.from
      ? `${fromState.from.pathname ?? ""}${fromState.from.search ?? ""}`
      : null) ??
    "/costs";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await api.post("/public/login", { email, password });
      login(res.data.token, res.data.user);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthBackground>
      <div className="w-full max-w-sm rounded-xl border border-line bg-surface p-6 shadow-xl">
        <div className="mb-6 flex items-center gap-2">
          <span className="text-2xl">💰</span>
          <h1 className="text-xl font-semibold text-ink">Log in</h1>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-ink-muted">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input mt-1"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-ink-muted">
              Password
            </label>
            <input
              id="password"
              autoComplete="current-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input mt-1"
            />
          </div>
          {error && <p className="text-sm text-down">{error}</p>}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full btn btn-primary disabled:opacity-50"
          >
            {isSubmitting ? "Logging in…" : "Log in"}
          </button>
        </form>
        <div className="mt-4 flex justify-between text-sm">
          <Link to="/forgot-password" className="text-ink-muted hover:text-accent">
            Forgot password?
          </Link>
          <Link to="/register" className="text-ink-muted hover:text-accent">
            Create account
          </Link>
        </div>
      </div>
    </AuthBackground>
  );
}
