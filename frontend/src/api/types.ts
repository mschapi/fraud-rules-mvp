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

export type SimulationMode = "date_range" | "query";

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

export type SimulationRun = SimulationResponse & {
  id: string;
  rule_id: string;
  mode: SimulationMode;
  created_at: string;
  start_date?: string;
  end_date?: string;
  query_text?: string;
};

export type AiSuggestion = {
  proposed_rule: RulePayload;
  explanation: string;
  warnings: string[];
  python_code?: string;
};

export type PrResponse = {
  pr_url: string;
  yaml_content: string;
  title: string;
  branch: string;
};

export type AlarmOperator = ">" | ">=" | "<" | "<=" | "outside_band";
export type AlarmSeverity = "low" | "medium" | "high" | "critical";
export type AlarmStatus = "active" | "draft" | "muted";

export type AlarmPayload = {
  name: string;
  description: string;
  signal: string;
  operator: AlarmOperator;
  threshold: number;
  window: string;
  severity: AlarmSeverity;
  channels: string[];
};

export type Alarm = AlarmPayload & {
  id: string;
  status: AlarmStatus;
  created_at: string;
  updated_at: string;
  last_triggered_at: string | null;
  anomaly_rate_pct: number;
  monitored_events: number;
};
