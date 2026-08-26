import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FamiliesApi } from "../api/families";
import { getErrorMessage } from "../lib/api";
import { useFamily } from "../lib/familyMeta";
import { useAuth } from "../context/AuthContext";
import type { FamilyMember } from "../types";

function relativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString();
}

export function FamilyPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data, isLoading, error } = useFamily();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["family"] });

  // --- Rename ---
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);

  useEffect(() => {
    setName(data?.family?.name ?? "");
  }, [data?.family?.name]);

  const renameMutation = useMutation({
    mutationFn: () => FamiliesApi.rename(name),
    onSuccess: invalidate,
    onError: (err) => setNameError(getErrorMessage(err)),
  });

  // --- Invites ---
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteNotice, setInviteNotice] = useState<string | null>(null);

  const inviteMutation = useMutation({
    mutationFn: () => FamiliesApi.invite(inviteEmail),
    onSuccess: (invite) => {
      setInviteEmail("");
      // The invite is saved either way; only delivery may have failed.
      setInviteNotice(
        invite.emailSent
          ? `Invite sent to ${invite.email}.`
          : `Invite created for ${invite.email}, but the email could not be sent. Try inviting again to resend.`
      );
      invalidate();
    },
    onError: (err) => setInviteError(getErrorMessage(err)),
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => FamiliesApi.revokeInvite(id),
    onSuccess: invalidate,
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => FamiliesApi.removeMember(id),
    onSuccess: invalidate,
    onError: (err) => setInviteError(getErrorMessage(err)),
  });

  // --- Activity ---
  const { data: activity } = useQuery({
    queryKey: ["family-activity"],
    queryFn: () => FamiliesApi.activity(1, 30),
  });

  const handleRename = (e: FormEvent) => {
    e.preventDefault();
    setNameError(null);
    renameMutation.mutate();
  };

  const handleInvite = (e: FormEvent) => {
    e.preventDefault();
    setInviteError(null);
    setInviteNotice(null);
    inviteMutation.mutate();
  };

  const handleRemove = (member: FamilyMember) => {
    setInviteError(null);
    if (
      confirm(
        `Remove ${member.name} from the family?\n\nEntries they already recorded stay in place and remain attributed to them.`
      )
    ) {
      removeMutation.mutate(member._id);
    }
  };

  const isCreator = (member: FamilyMember) => data?.family?.createdBy === member._id;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-semibold text-ink">Family</h1>

      {error && <p className="mb-4 text-sm text-down">{getErrorMessage(error)}</p>}
      {isLoading && <p className="text-sm text-ink-muted">Loading…</p>}

      {/* Name */}
      <form onSubmit={handleRename} className="mb-6 card-lg">
        <h2 className="mb-4 text-sm font-semibold text-ink-muted">Family name</h2>
        <div className="flex flex-wrap items-end gap-3">
          <input
            aria-label="Family name"
            required
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input min-w-56 flex-1"
          />
          <button type="submit" disabled={renameMutation.isPending} className="btn btn-primary">
            {renameMutation.isPending ? "Saving…" : "Rename"}
          </button>
        </div>
        {nameError && <p className="mt-3 text-sm text-down">{nameError}</p>}
      </form>

      {/* Members */}
      <div className="mb-6 card-lg">
        <h2 className="mb-1 text-sm font-semibold text-ink-muted">Members</h2>
        <p className="mb-4 text-xs text-ink-dim">
          Everyone in the family shares the same costs, budgets and reports, and can edit them.
          Every change is recorded below.
        </p>

        <div className="space-y-2">
          {data?.members.map((member) => (
            <div
              key={member._id}
              className="flex items-center justify-between gap-4 rounded-lg border border-line px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-ink">
                  {member.name}
                  {member._id === user?._id && <span className="ml-2 text-xs text-ink-dim">(you)</span>}
                  {isCreator(member) && (
                    <span className="ml-2 rounded-full bg-accent-soft px-2 py-0.5 text-xs text-ink-muted">
                      creator
                    </span>
                  )}
                </p>
                <p className="truncate text-xs text-ink-dim">{member.email}</p>
              </div>
              {!isCreator(member) && (
                <button
                  type="button"
                  onClick={() => handleRemove(member)}
                  className="shrink-0 text-sm text-down hover:opacity-80"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Invites */}
      <div className="mb-6 card-lg">
        <h2 className="mb-4 text-sm font-semibold text-ink-muted">Invite someone</h2>
        <form onSubmit={handleInvite} className="flex flex-wrap items-end gap-3">
          <input
            aria-label="Email to invite"
            type="email"
            required
            placeholder="their@email.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            className="input min-w-56 flex-1"
          />
          <button type="submit" disabled={inviteMutation.isPending} className="btn btn-primary">
            {inviteMutation.isPending ? "Sending…" : "Send invite"}
          </button>
        </form>
        <p className="mt-2 text-xs text-ink-dim">
          They need an account with this email address before they can join.
        </p>
        {inviteError && <p className="mt-3 text-sm text-down">{inviteError}</p>}
        {inviteNotice && <p className="mt-3 text-sm text-ink-muted">{inviteNotice}</p>}

        {(data?.pendingInvites.length ?? 0) > 0 && (
          <div className="mt-5 border-t border-line pt-4">
            <h3 className="mb-2 text-xs font-semibold text-ink-muted">Pending</h3>
            <div className="space-y-2">
              {data?.pendingInvites.map((invite) => (
                <div
                  key={invite._id}
                  className="flex items-center justify-between gap-4 rounded-lg border border-line px-4 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-ink">{invite.email}</p>
                    <p className="text-xs text-ink-dim">
                      expires {new Date(invite.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => revokeMutation.mutate(invite._id)}
                    className="shrink-0 text-sm text-ink-muted hover:text-down"
                  >
                    Revoke
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Activity log */}
      <div className="card-lg">
        <h2 className="mb-1 text-sm font-semibold text-ink-muted">Activity</h2>
        <p className="mb-4 text-xs text-ink-dim">
          Who changed what. Anyone can edit shared data, so this is the record of it.
        </p>

        {activity?.items.length === 0 && (
          <p className="text-sm text-ink-dim">Nothing recorded yet.</p>
        )}

        <div className="space-y-1">
          {activity?.items.map((entry) => (
            <div key={entry._id} className="flex items-baseline justify-between gap-4 py-1.5">
              <p className="min-w-0 text-sm text-ink-muted">
                <span className="font-medium text-ink">{entry.actor?.name ?? "Someone"}</span>{" "}
                {entry.summary}
              </p>
              <span className="shrink-0 text-xs text-ink-dim">{relativeTime(entry.createdAt)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
