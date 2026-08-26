import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { api, getErrorMessage } from "../lib/api";
import { AuthBackground } from "../components/AuthBackground";

export function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await api.post("/public/register", { name, email, password });
      setSuccess(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <AuthBackground>
        <div className="w-full max-w-sm rounded-xl border border-line bg-surface p-6 text-center shadow-xl">
          <h1 className="mb-2 text-xl font-semibold text-ink">Check your email</h1>
          <p className="text-sm text-ink-muted">
            We sent a verification link to <span className="font-medium">{email}</span>. Verify your
            email before logging in.
          </p>
          <Link to="/login" className="mt-4 inline-block text-sm text-accent underline">
            Back to log in
          </Link>
        </div>
      </AuthBackground>
    );
  }

  return (
    <AuthBackground>
      <div className="w-full max-w-sm rounded-xl border border-line bg-surface p-6 shadow-xl">
        <div className="mb-6 flex items-center gap-2">
          <span className="text-2xl">💰</span>
          <h1 className="text-xl font-semibold text-ink">Create account</h1>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-ink-muted">
              Name
            </label>
            <input
              id="name"
              autoComplete="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input mt-1"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-ink-muted">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
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
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
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
            {isSubmitting ? "Creating account…" : "Create account"}
          </button>
        </form>
        <div className="mt-4 text-center text-sm">
          <Link to="/login" className="text-ink-muted hover:text-accent">
            Already have an account? Log in
          </Link>
        </div>
      </div>
    </AuthBackground>
  );
}
