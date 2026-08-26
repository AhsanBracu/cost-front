import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { FamiliesApi } from "../api/families";
import { getErrorMessage } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { AuthBackground } from "../components/AuthBackground";

export function JoinFamilyPage() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const { token: authToken, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [status, setStatus] = useState<"idle" | "joining" | "joined" | "error">("idle");
  const [message, setMessage] = useState("");
  // Guards against the double-invoke of effects in React StrictMode, which
  // would otherwise consume the single-use token twice.
  const attempted = useRef(false);

  useEffect(() => {
    if (authLoading || attempted.current) return;

    if (!token) {
      setStatus("error");
      setMessage("This link is missing its invite token.");
      return;
    }

    // Joining needs an account: the invite is matched against your email.
    if (!authToken) return;

    attempted.current = true;
    setStatus("joining");

    FamiliesApi.acceptInvite(token)
      .then((family) => {
        setStatus("joined");
        setMessage(`You've joined ${family.name}.`);
        queryClient.invalidateQueries();
      })
      .catch((err) => {
        setStatus("error");
        setMessage(getErrorMessage(err));
      });
  }, [token, authToken, authLoading, queryClient]);

  const next = `/join-family?token=${encodeURIComponent(token ?? "")}`;

  if (authLoading) {
    return (
      <AuthBackground>
        <p className="text-sm text-ink-muted">Loading…</p>
      </AuthBackground>
    );
  }

  if (!authToken) {
    return (
      <AuthBackground>
        <div className="w-full max-w-sm rounded-xl border border-line bg-surface p-6 text-center shadow-xl">
          <h1 className="mb-2 text-lg font-semibold text-ink">Join a family</h1>
          <p className="mb-5 text-sm text-ink-muted">
            Log in with the email address the invite was sent to, and this link will add you to the
            family.
          </p>
          <Link to={`/login?next=${encodeURIComponent(next)}`} className="btn btn-primary inline-flex">
            Log in to continue
          </Link>
          <p className="mt-4 text-xs text-ink-dim">
            No account yet?{" "}
            <Link to="/register" className="text-accent hover:underline">
              Create one
            </Link>{" "}
            with that email, then open this link again.
          </p>
        </div>
      </AuthBackground>
    );
  }

  return (
    <AuthBackground>
      <div className="w-full max-w-sm rounded-xl border border-line bg-surface p-6 text-center shadow-xl">
        <h1 className="mb-2 text-lg font-semibold text-ink">Join a family</h1>

        {status === "joining" && <p className="text-sm text-ink-muted">Joining…</p>}

        {status === "joined" && (
          <>
            <p className="mb-5 text-sm text-up">{message}</p>
            <button type="button" onClick={() => navigate("/family")} className="btn btn-primary">
              Go to the family
            </button>
          </>
        )}

        {status === "error" && (
          <>
            <p className="mb-5 text-sm text-down">{message}</p>
            <button type="button" onClick={() => navigate("/costs")} className="btn btn-ghost">
              Back to the app
            </button>
          </>
        )}
      </div>
    </AuthBackground>
  );
}
