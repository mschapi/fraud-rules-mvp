export type Operator = "==" | "!=" | ">" | ">=" | "<" | "<=" | "in" | "not_in";
export type Action = "review" | "reject" | "approve";
export type VariableType = "number" | "boolean" | "string";

export type Variable = {
  name: string;
  label: string;
  type: VariableType;
  description: string;
  allowed_operators: Operator[];
};

export type Condition = {
  field: string;
  operator: Operator;
  value: unknown;
};

export type RulePayload = {
  name: string;
  description: string;
  action: Action;
  conditions: {
    all: Condition[];
  };
};

export type Rule = RulePayload & {
  id: string;
  status: string;
  created_at: string;
  updated_at: string;
  last_simulation: SimulationMetrics | null;
};

export type SimulationMetrics = {
  total_transactions: number;
  matched_transactions: number;
  matched_transactions_pct: number;
  total_fraud_transactions: number;
  captured_fraud_transactions: number;
  captured_fraud_transactions_pct: number;
  total_amount: number;
  matched_amount: number;
  total_fraud_amount: number;
  captured_fraud_amount: number;
  captured_fraud_amount_pct: number;
  fraud_rate_inside_rule: number;
  fraud_rate_global: number;
  lift: number;
};

export type SimulationResponse = {
  metrics: SimulationMetrics;
  warnings: string[];
};

export type AiSuggestion = {
  proposed_rule: RulePayload;
  explanation: string;
  warnings: string[];
};

export type PrResponse = {
  pr_url: string;
  yaml_content: string;
  title: string;
  branch: string;
};
