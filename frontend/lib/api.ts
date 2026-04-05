const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8120";

async function fetchAPI<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || `API error: ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// --- Clients ---
export const clientsAPI = {
  list: (search?: string) =>
    fetchAPI<import("./types").ClientListItem[]>(
      `/clients${search ? `?search=${encodeURIComponent(search)}` : ""}`
    ),
  get: (id: string) => fetchAPI<import("./types").Client>(`/clients/${id}`),
  create: (data: Record<string, unknown>) =>
    fetchAPI<import("./types").Client>("/clients", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Record<string, unknown>) =>
    fetchAPI<import("./types").Client>(`/clients/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    fetchAPI<void>(`/clients/${id}`, { method: "DELETE" }),
};

// --- Proposals ---
export const proposalsAPI = {
  list: (filters?: { status?: string; client_id?: string }) => {
    const params = new URLSearchParams();
    if (filters?.status) params.set("status", filters.status);
    if (filters?.client_id) params.set("client_id", filters.client_id);
    const qs = params.toString();
    return fetchAPI<import("./types").ProposalListItem[]>(
      `/proposals${qs ? `?${qs}` : ""}`
    );
  },
  get: (id: string) =>
    fetchAPI<import("./types").Proposal>(`/proposals/${id}`),
  create: (data: Record<string, unknown>) =>
    fetchAPI<import("./types").Proposal>("/proposals", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Record<string, unknown>) =>
    fetchAPI<import("./types").Proposal>(`/proposals/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    fetchAPI<void>(`/proposals/${id}`, { method: "DELETE" }),
  send: (id: string) =>
    fetchAPI<{ status: string; view_token: string }>(`/proposals/${id}/send`, {
      method: "POST",
    }),
  generateDraft: (id: string, data?: Record<string, unknown>) => {
    // Returns EventSource URL for SSE streaming
    return `${API_URL}/api/proposals/${id}/generate-draft`;
  },
  refine: (id: string, data: { message: string; section_type?: string; model?: string }) =>
    fetchAPI<import("./types").RefinementResponse>(`/proposals/${id}/refine`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateSection: (proposalId: string, sectionType: string, content: string) =>
    fetchAPI<void>(`/proposals/${proposalId}/sections/${sectionType}`, {
      method: "POST",
      body: JSON.stringify({ content }),
    }),
  exportPDF: (id: string) => `${API_URL}/api/proposals/${id}/export-pdf`,
  exportDOCX: (id: string) => `${API_URL}/api/proposals/${id}/export-docx`,
  generateDiagrams: (id: string) =>
    fetchAPI<{ generated: number }>(`/proposals/${id}/diagrams`, {
      method: "POST",
    }),
  conversations: (id: string) =>
    fetchAPI<Array<{ id: string; user_message: string; ai_response: string; section_modified: string | null; created_at: string }>>(
      `/proposals/${id}/conversations`
    ),
};

// --- Templates ---
export const templatesAPI = {
  list: (proposalType?: string) =>
    fetchAPI<import("./types").Template[]>(
      `/templates${proposalType ? `?proposal_type=${proposalType}` : ""}`
    ),
  get: (id: string) => fetchAPI<import("./types").Template>(`/templates/${id}`),
  create: (data: Record<string, unknown>) =>
    fetchAPI<import("./types").Template>("/templates", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Record<string, unknown>) =>
    fetchAPI<import("./types").Template>(`/templates/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    fetchAPI<void>(`/templates/${id}`, { method: "DELETE" }),
};

// --- Dashboard ---
export const dashboardAPI = {
  stats: () => fetchAPI<import("./types").DashboardStats>("/dashboard/stats"),
  recentProposals: () =>
    fetchAPI<import("./types").ProposalListItem[]>("/dashboard/recent-proposals"),
  pipeline: () =>
    fetchAPI<Array<{ status: string; count: number; value: number }>>(
      "/dashboard/clients-pipeline"
    ),
};

// --- Pricing Packages ---
export const pricingAPI = {
  listPackages: (proposalType?: string) =>
    fetchAPI<Array<{ id: string; name: string; base_price: number; description: string | null; includes: Record<string, unknown> | null }>>(
      `/pricing-packages${proposalType ? `?proposal_type=${proposalType}` : ""}`
    ),
  updateProposalPricing: (proposalId: string, items: Record<string, unknown>[]) =>
    fetchAPI<import("./types").PricingItem[]>(`/proposals/${proposalId}/pricing`, {
      method: "PUT",
      body: JSON.stringify(items),
    }),
};
