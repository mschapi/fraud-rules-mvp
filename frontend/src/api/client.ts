import type { AiSuggestion, PrResponse, Rule, RulePayload, SimulationResponse, Variable } from "./types";
import { ruleToPython } from "../features/rules/pythonGenerator";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";
const IS_DEMO = import.meta.env.VITE_DEMO_MODE === "true";

const variables: Variable[] = [
  {
    name: "user_age_days",
    label: "User age in days",
    type: "number",
    description: "Number of days since user registration",
    allowed_operators: ["<", "<=", ">", ">=", "==", "!="],
  },
  {
    name: "tx_count_10m",
    label: "Transactions in last 10 minutes",
    type: "number",
    description: "Number of transactions from this user in the last 10 minutes",
    allowed_operators: ["<", "<=", ">", ">=", "==", "!="],
  },
  {
    name: "distinct_cards_15m",
    label: "Distinct cards in last 15 minutes",
    type: "number",
    description: "Number of distinct cards used by the user in the last 15 minutes",
    allowed_operators: ["<", "<=", ">", ">=", "==", "!="],
  },
  {
    name: "failed_payment_attempts_15m",
    label: "Failed payment attempts in last 15 minutes",
    type: "number",
    description: "Number of failed payment attempts in the last 15 minutes",
    allowed_operators: ["<", "<=", ">", ">=", "==", "!="],
  },
  {
    name: "is_new_card",
    label: "Is new card",
    type: "boolean",
    description: "Whether the card was recently added",
    allowed_operators: ["==", "!="],
  },
  {
    name: "amount",
    label: "Transaction amount",
    type: "number",
    description: "Transaction amount",
    allowed_operators: ["<", "<=", ">", ">=", "==", "!="],
  },
  {
    name: "country",
    label: "Country",
    type: "string",
    description: "Transaction country",
    allowed_operators: ["==", "!=", "in", "not_in"],
  },
  {
    name: "model_score",
    label: "Model score",
    type: "number",
    description: "Fraud model score between 0 and 1",
    allowed_operators: ["<", "<=", ">", ">=", "==", "!="],
  },
];

const now = new Date().toISOString();
const demoRules: Rule[] = [
  {
    id: "high_velocity_new_user",
    name: "high_velocity_new_user",
    description: "New users with repeated purchase attempts in a short window.",
    action: "review",
    status: "active",
    conditions: {
      all: [
        { field: "user_age_days", operator: "<=", value: 7 },
        { field: "tx_count_10m", operator: ">=", value: 3 },
      ],
    },
    created_at: now,
    updated_at: now,
    last_simulation: {
      total_transactions: 5000,
      matched_transactions: 142,
      matched_transactions_pct: 2.84,
      total_fraud_transactions: 176,
      captured_fraud_transactions: 39,
      captured_fraud_transactions_pct: 22.16,
      total_amount: 618450,
      matched_amount: 28720,
      total_fraud_amount: 54120,
      captured_fraud_amount: 14980,
      captured_fraud_amount_pct: 27.68,
      fraud_rate_inside_rule: 27.46,
      fraud_rate_global: 3.52,
      lift: 7.8,
    },
  },
  {
    id: "new_card_high_score",
    name: "new_card_high_score",
    description: "Recently added cards with a high model score.",
    action: "reject",
    status: "draft",
    conditions: {
      all: [
        { field: "is_new_card", operator: "==", value: true },
        { field: "model_score", operator: ">=", value: 0.82 },
      ],
    },
    created_at: now,
    updated_at: now,
    last_simulation: null,
  },
];

function readRules(): Rule[] {
  const stored = window.localStorage.getItem("fraud-rules-demo");
  if (!stored) return demoRules;
  return JSON.parse(stored) as Rule[];
}

function writeRules(rules: Rule[]) {
  window.localStorage.setItem("fraud-rules-demo", JSON.stringify(rules));
}

function toRule(payload: RulePayload, status = "active"): Rule {
  const timestamp = new Date().toISOString();
  return {
    ...payload,
    id: payload.name.trim().toLowerCase().replace(/\s+/g, "_"),
    status,
    created_at: timestamp,
    updated_at: timestamp,
    last_simulation: null,
  };
}

const demoApi = {
  variables: async () => variables,
  rules: async () => readRules(),
  rule: async (id: string) => {
    const rule = readRules().find((item) => item.id === id);
    if (!rule) throw new Error("Rule not found.");
    return rule;
  },
  createRule: async (payload: RulePayload) => {
    const rules = readRules();
    const rule = toRule(payload);
    writeRules([rule, ...rules.filter((item) => item.id !== rule.id)]);
    return rule;
  },
  updateRule: async (id: string, payload: RulePayload & { status: string }) => {
    const rules = readRules();
    const nextRule: Rule = {
      ...toRule(payload, payload.status),
      id,
      created_at: rules.find((item) => item.id === id)?.created_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_simulation: rules.find((item) => item.id === id)?.last_simulation ?? null,
    };
    writeRules(rules.map((item) => (item.id === id ? nextRule : item)));
    return nextRule;
  },
  simulate: async (id: string, _payload: { start_date: string; end_date: string }): Promise<SimulationResponse> => {
    const rules = readRules();
    const metrics = {
      total_transactions: 5000,
      matched_transactions: 186,
      matched_transactions_pct: 3.72,
      total_fraud_transactions: 176,
      captured_fraud_transactions: 44,
      captured_fraud_transactions_pct: 25,
      total_amount: 618450,
      matched_amount: 33680,
      total_fraud_amount: 54120,
      captured_fraud_amount: 16240,
      captured_fraud_amount_pct: 30.01,
      fraud_rate_inside_rule: 23.66,
      fraud_rate_global: 3.52,
      lift: 6.72,
    };
    writeRules(rules.map((item) => (item.id === id ? { ...item, last_simulation: metrics } : item)));
    return { metrics, warnings: ["Demo mode uses deterministic mock historical transactions."] };
  },
  suggestRule: async (message: string): Promise<AiSuggestion> => {
    const lowered = message.toLowerCase();
    const proposed_rule: RulePayload = {
      name: "ai_suggested_rule",
      description: "Draft rule generated from an assistant request",
      action: lowered.includes("reject") || lowered.includes("rechaz") ? "reject" : "review",
      conditions: {
        all: lowered.includes("python") || lowered.includes("card") || lowered.includes("tarjeta")
          ? [
              { field: "is_new_card", operator: "==", value: true },
              { field: "model_score", operator: ">=", value: 0.75 },
            ]
          : lowered.includes("new") || lowered.includes("nuevo")
            ? [
                { field: "user_age_days", operator: "<=", value: 7 },
                { field: "tx_count_10m", operator: ">=", value: 3 },
              ]
          : [{ field: "model_score", operator: ">=", value: 0.75 }],
      },
    };
    return {
      proposed_rule,
      python_code: ruleToPython(proposed_rule),
      explanation: "Demo assistant maps common phrases to controlled catalog fields and renders deployable Python.",
      warnings: ["Demo mode does not call an AI API. The generated Python is deterministic from the structured rule."],
    };
  },
  createPr: async (id: string): Promise<PrResponse> => ({
    pr_url: "https://github.com/mschapi/fraud-rules-mvp/pull/demo",
    title: `Deploy rule ${id}`,
    branch: `rules/${id}`,
    yaml_content: `id: ${id}\nstatus: ready_for_review\nsource: demo\n`,
  }),
};

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

const liveApi = {
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

export const api = IS_DEMO ? demoApi : liveApi;
