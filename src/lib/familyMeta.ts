import { useQuery } from "@tanstack/react-query";
import { FamiliesApi } from "../api/families";
import { useAuth } from "../context/AuthContext";

/** The shared value meaning "a household cost", since a <select> can't submit null. */
export const SHARED = "shared";

/** The shared value meaning "the household budget", rather than one person's. */
export const HOUSEHOLD = "household";

export function useFamily() {
  return useQuery({
    queryKey: ["family"],
    queryFn: () => FamiliesApi.get(),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Members plus a couple of conveniences the person pickers need. A solo
 * household still returns one member (you), so the pickers work the same
 * before and after anyone is invited.
 */
export function useFamilyMembers() {
  const { data } = useFamily();
  const { user } = useAuth();

  const members = data?.members ?? [];

  return {
    members,
    /** True once there's someone to attribute things to besides yourself. */
    hasOthers: members.length > 1,
    currentUserId: user?._id ?? null,
    nameOf: (id: string | null | undefined) => {
      if (!id) return "Shared";
      return members.find((m) => m._id === id)?.name ?? "Unknown";
    },
  };
}

/**
 * Some endpoints populate a member reference into an object and others leave
 * it as a raw id, so callers normalise with this before comparing.
 */
export function idOf(value: { _id: string } | string | null | undefined): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value._id;
}
