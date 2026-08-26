import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, getErrorMessage } from "../lib/api";
import { AuthBackground } from "../components/AuthBackground";

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setError("Missing verification token.");
      return;
    }

    api
      .get("/public/verify-email", { params: { token } })
      .then(() => setStatus("success"))
      .catch((err) => {
        setStatus("error");
        setError(getErrorMessage(err));
      });
  }, [token]);

  return (
    <AuthBackground>
      <div className="w-full max-w-sm rounded-xl border border-line bg-surface p-6 text-center shadow-xl">
        {status === "loading" && <p className="text-sm text-ink-muted">Verifying your email…</p>}
        {status === "success" && (
          <>
            <h1 className="mb-2 text-xl font-semibold text-ink">Email verified</h1>
            <p className="text-sm text-ink-muted">You can now log in to your account.</p>
          </>
        )}
        {status === "error" && <p className="text-sm text-down">{error}</p>}
        <Link to="/login" className="mt-4 inline-block text-sm text-accent underline">
          Go to log in
        </Link>
      </div>
    </AuthBackground>
  );
}
