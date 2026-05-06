import type { AiSuggestion, PrResponse, Rule, RulePayload, SimulationResponse, Variable } from "./types";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(typeof error.detail === "string" ? error.detail : "Request failed");
  }
  return response.json() as Promise<T>;
}

export const api = {
  variables: () => request<Variable[]>("/variables"),
  rules: () => request<Rule[]>("/rules"),
  rule: (id: string) => request<Rule>(`/rules/${id}`),
  createRule: (payload: RulePayload) =>
    request<Rule>("/rules", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateRule: (id: string, payload: RulePayload & { status: string }) =>
    request<Rule>(`/rules/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  simulate: (id: string, payload: { start_date: string; end_date: string }) =>
    request<SimulationResponse>(`/rules/${id}/simulate`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  suggestRule: (message: string) =>
    request<AiSuggestion>("/ai/rule-suggestion", {
      method: "POST",
      body: JSON.stringify({ message }),
    }),
  createPr: (id: string) =>
    request<PrResponse>(`/rules/${id}/create-pr`, {
      method: "POST",
    }),
};

