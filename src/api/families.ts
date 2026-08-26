import { api } from "../lib/api";
import type { ActivityLogResult, Family, FamilyResult } from "../types";

export const FamiliesApi = {
  get: async (): Promise<FamilyResult> => {
    const res = await api.get("/families/me");
    return res.data;
  },

  rename: async (name: string): Promise<Family> => {
    const res = await api.patch("/families/me", { name });
    return res.data.family;
  },

  invite: async (email: string): Promise<{ email: string; expiresAt: string; emailSent: boolean }> => {
    const res = await api.post("/families/invites", { email });
    return res.data.invite;
  },

  revokeInvite: async (id: string): Promise<void> => {
    await api.delete(`/families/invites/${id}`);
  },

  acceptInvite: async (token: string): Promise<Family> => {
    const res = await api.post("/families/invites/accept", { token });
    return res.data.family;
  },

  removeMember: async (id: string): Promise<void> => {
    await api.delete(`/families/members/${id}`);
  },

  activity: async (page = 1, limit = 50): Promise<ActivityLogResult> => {
    const res = await api.get("/families/activity", { params: { page, limit } });
    return res.data;
  },
};
