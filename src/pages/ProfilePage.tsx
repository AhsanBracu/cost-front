import { useState } from "react";
import type { FormEvent } from "react";
import { api, getErrorMessage } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export function ProfilePage() {
  const { user } = useAuth();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setIsSubmitting(true);
    try {
      await api.patch("/users/change-password", { oldPassword, newPassword });
      setSuccess(true);
      setOldPassword("");
      setNewPassword("");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="card-lg">
        <div className="mb-4 flex items-center gap-2">
          <span className="text-2xl">👤</span>
          <h1 className="text-xl font-semibold text-ink">Profile</h1>
        </div>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-ink-muted">Name</dt>
            <dd className="text-ink">{user?.name}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-muted">Email</dt>
            <dd className="text-ink">{user?.email}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-muted">Verified</dt>
            <dd>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  user?.isVerified ? "bg-up/10 text-up" : "bg-warn/10 text-warn"
                }`}
              >
                {user?.isVerified ? "Yes" : "No"}
              </span>
            </dd>
          </div>
        </dl>
      </div>

      <div className="card-lg">
        <h2 className="mb-4 text-lg font-semibold text-ink">Change password</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="oldPassword" className="block text-sm font-medium text-ink-muted">
              Current password
            </label>
            <input
              id="oldPassword"
              type="password"
              autoComplete="current-password"
              required
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="input mt-1"
            />
          </div>
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-ink-muted">
              New password
            </label>
            <input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="input mt-1"
            />
          </div>
          {error && <p className="text-sm text-down">{error}</p>}
          {success && <p className="text-sm text-up">Password updated successfully.</p>}
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-primary"
          >
            {isSubmitting ? "Updating…" : "Update password"}
          </button>
        </form>
      </div>
    </div>
  );
}
