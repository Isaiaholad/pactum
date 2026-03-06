import { create } from 'zustand';
import { api } from '../utils/api';

export const usePactumStore = create((set, get) => ({
  user: null,
  walletBalance: 0,
  activePacts: [],
  explorePacts: [],
  pendingInvites: [],
  notifications: [],
  loading: false,
  error: null,

  bootstrap: async () => {
    const t = localStorage.getItem('pactum_token');
    if (!t) return;
    try {
      const me = await api.me();
      set({ user: me.user, walletBalance: me.user.wallet_balance });
      await get().refreshAll();
    } catch {
      localStorage.removeItem('pactum_token');
      set({ user: null });
    }
  },

  login: async (payload) => {
    const res = await api.login(payload);
    localStorage.setItem('pactum_token', res.token);
    set({ user: res.user, walletBalance: res.user.wallet_balance });
    await get().refreshAll();
  },

  register: async (payload) => {
    const res = await api.register(payload);
    localStorage.setItem('pactum_token', res.token);
    set({ user: res.user, walletBalance: res.user.wallet_balance });
    await get().refreshAll();
  },

  googleLogin: async (email) => {
    const res = await api.google({ email });
    localStorage.setItem('pactum_token', res.token);
    set({ user: res.user, walletBalance: res.user.wallet_balance });
    await get().refreshAll();
  },

  logout: () => {
    localStorage.removeItem('pactum_token');
    set({ user: null, walletBalance: 0, activePacts: [], explorePacts: [], pendingInvites: [], notifications: [] });
  },

  refreshAll: async () => {
    const user = get().user;
    if (!user) return;
    const [pactsRes, walletRes, noteRes, exploreRes] = await Promise.all([
      api.listPacts(user.id),
      api.walletBalance(user.id),
      api.notifications(user.id),
      api.explorePacts(user.id),
    ]);

    const pacts = pactsRes.pacts || [];
    set({
      activePacts: pacts,
      explorePacts: exploreRes.pacts || [],
      walletBalance: walletRes.balance || 0,
      pendingInvites: pacts.filter((p) => p.status === 'Pending Acceptance' && p.opponent_id === user.id),
      notifications: noteRes.notifications || [],
    });
  },

  createPact: async (payload) => {
    await api.createPact(payload);
    await get().refreshAll();
  },

  acceptInvite: async (pactId) => {
    await api.acceptPact(pactId, get().user.id);
    await get().refreshAll();
  },

  rejectInvite: async (pactId) => {
    await api.rejectPact(pactId, get().user.id);
    await get().refreshAll();
  },

  depositStake: async (pactId) => {
    await api.depositPact(pactId, { user_id: get().user.id });
    await get().refreshAll();
  },

  submitResult: async (pactId, winnerId, evidenceUrl) => {
    await api.submitResult(pactId, { user_id: get().user.id, winner_id: winnerId, evidence_url: evidenceUrl || '' });
    await get().refreshAll();
  },

  resolvePact: async (pactId) => {
    await api.confirmResult(pactId, get().user.id);
    await get().refreshAll();
  },

  disputePact: async (pactId) => {
    await api.disputeResult(pactId, get().user.id);
    await get().refreshAll();
  },

  claimFunds: async () => {
    await get().refreshAll();
  },

  markNotificationRead: async (notificationId) => {
    const user = get().user;
    if (!user || !notificationId) return;
    await api.markNotificationRead({ user_id: user.id, notification_id: notificationId });
    await get().refreshAll();
  },
}));
