import type { SimulationMetrics } from "../api/types";

const items: Array<{ value: (metrics: SimulationMetrics) => string | number; label: string }> = [
  { value: (metrics) => metrics.total_transactions, label: "Total transactions" },
  { value: (metrics) => metrics.matched_transactions, label: "Blocked transactions" },
  { value: (metrics) => `${metrics.matched_transactions_pct}%`, label: "Bloqueo" },
  {
    value: (metrics) => `${metrics.matched_amount ? ((metrics.captured_fraud_amount / metrics.matched_amount) * 100).toFixed(2) : 0}%`,
    label: "Eficiencia",
  },
  { value: (metrics) => metrics.total_amount, label: "Total amount" },
  { value: (metrics) => metrics.matched_amount, label: "Blocked amount" },
  { value: (metrics) => metrics.captured_fraud_amount, label: "Fraud amount blocked" },
  { value: (metrics) => `${metrics.fraud_rate_global}%`, label: "Global fraud rate" },
];

export function MetricGrid({ metrics }: { metrics: SimulationMetrics }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <div className="rounded-md border border-line bg-white p-3 shadow-sm" key={item.label}>
          <div className="text-xs font-semibold uppercase text-muted">{item.label}</div>
          <div className="mt-1 text-2xl font-extrabold text-ink">
            {item.value(metrics)}
          </div>
        </div>
      ))}
    </div>
  );
}
