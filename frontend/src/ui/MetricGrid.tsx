import type { SimulationMetrics } from "../api/types";

const items: Array<{ key: keyof SimulationMetrics; label: string; suffix?: string }> = [
  { key: "total_transactions", label: "Total transactions" },
  { key: "matched_transactions", label: "Matched transactions" },
  { key: "matched_transactions_pct", label: "Traffic affected", suffix: "%" },
  { key: "captured_fraud_transactions_pct", label: "Fraud qty captured", suffix: "%" },
  { key: "captured_fraud_amount_pct", label: "Fraud amount captured", suffix: "%" },
  { key: "fraud_rate_inside_rule", label: "Fraud rate inside", suffix: "%" },
  { key: "fraud_rate_global", label: "Global fraud rate", suffix: "%" },
  { key: "lift", label: "Lift" },
];

export function MetricGrid({ metrics }: { metrics: SimulationMetrics }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <div className="rounded-md border border-line bg-white p-3 shadow-sm" key={item.key}>
          <div className="text-xs font-semibold uppercase text-muted">{item.label}</div>
          <div className="mt-1 text-2xl font-extrabold text-ink">
            {metrics[item.key]}
            {item.suffix ?? ""}
          </div>
        </div>
      ))}
    </div>
  );
}
