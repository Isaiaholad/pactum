const token = () => localStorage.getItem('pactum_token');

async function request(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  const t = token();
  if (t) headers.Authorization = `Bearer ${t}`;
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(path, { ...options, headers });
  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  let data;
  if (isJson) {
    data = await res.json();
  } else {
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`Server returned non-JSON response (${res.status}). Check backend logs.`);
    }
    throw new Error(`Unexpected non-JSON response: ${text.slice(0, 120)}`);
  }

  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  register: (payload) => request('/api/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  google: (payload) => request('/api/auth/google', { method: 'POST', body: JSON.stringify(payload) }),
  me: () => request('/api/auth/me'),

  listPacts: (userId) => request(`/api/pacts/?user_id=${userId}`),
  explorePacts: (userId) => request(`/api/pacts/explore?user_id=${userId}`),
  getPact: (id) => request(`/api/pacts/${id}`),
  createPact: (payload) => request('/api/pacts/create', { method: 'POST', body: JSON.stringify(payload) }),
  acceptPact: (id, user_id) => request(`/api/pacts/${id}/accept`, { method: 'POST', body: JSON.stringify({ user_id }) }),
  rejectPact: (id, user_id) => request(`/api/pacts/${id}/reject`, { method: 'POST', body: JSON.stringify({ user_id }) }),
  depositPact: (id, payload) => request(`/api/pacts/${id}/deposit`, { method: 'POST', body: JSON.stringify(payload) }),
  submitResult: (id, payload) => request(`/api/pacts/${id}/submit-result`, { method: 'POST', body: JSON.stringify(payload) }),
  confirmResult: (id, user_id) => request(`/api/pacts/${id}/confirm`, { method: 'POST', body: JSON.stringify({ user_id }) }),
  disputeResult: (id, user_id) => request(`/api/pacts/${id}/dispute`, { method: 'POST', body: JSON.stringify({ user_id }) }),
  uploadEvidence: (id, payload) => request(`/api/pacts/${id}/evidence`, { method: 'POST', body: JSON.stringify(payload) }),
  uploadEvidenceFile: (id, payload) => {
    const form = new FormData();
    form.append('user_id', String(payload.user_id));
    form.append('file', payload.file);
    return request(`/api/pacts/${id}/evidence`, { method: 'POST', body: form });
  },
  addPactComment: (id, payload) => request(`/api/pacts/${id}/comments`, { method: 'POST', body: JSON.stringify(payload) }),

  walletBalance: (userId) => request(`/api/wallet/balance?user_id=${userId}`),
  walletTransactions: (userId) => request(`/api/wallet/transactions?user_id=${userId}`),
  walletDeposit: (payload) => request('/api/wallet/deposit', { method: 'POST', body: JSON.stringify(payload) }),
  walletWithdraw: (payload) => request('/api/wallet/withdraw', { method: 'POST', body: JSON.stringify(payload) }),

  profile: (username) => request(`/api/profile/${username}`),
  notifications: (userId) => request(`/api/notifications/?user_id=${userId}`),
  markNotificationRead: (payload) => request('/api/notifications/read', { method: 'POST', body: JSON.stringify(payload) }),

  adminDisputes: (adminUserId) => request(`/api/admin/disputes?admin_user_id=${adminUserId}`),
  adminResolveDispute: (pactId, payload) => request(`/api/admin/disputes/${pactId}/resolve`, { method: 'POST', body: JSON.stringify(payload) }),
};
