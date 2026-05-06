import { useMutation } from "@tanstack/react-query";
import { Play } from "lucide-react";
import { useMemo, useState } from "react";

import { api } from "../../api/client";
import type { SimulationResponse } from "../../api/types";
import { MetricGrid } from "../../ui/MetricGrid";

function isoDate(daysAgo: number) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

export function SimulationPanel({ ruleId, onComplete }: { ruleId: string; onComplete?: () => void }) {
  const [startDate, setStartDate] = useState(isoDate(30));
  const [endDate, setEndDate] = useState(isoDate(0));
  const [result, setResult] = useState<SimulationResponse | null>(null);

  const mutation = useMutation({
    mutationFn: () => api.simulate(ruleId, { start_date: startDate, end_date: endDate }),
    onSuccess: (data) => {
      setResult(data);
      onComplete?.();
    },
  });

  const warnings = useMemo(() => result?.warnings ?? [], [result]);

  return (
    <section className="card p-4">
      <div className="mb-4 flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
        <div>
          <h2 className="font-semibold">Simulation</h2>
          <p className="text-sm text-muted">Run the rule against mock historical transactions.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-[180px_180px_auto]">
          <label className="field">
            <span className="label">Start date</span>
            <input className="input" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          </label>
          <label className="field">
            <span className="label">End date</span>
            <input className="input" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
          </label>
          <button className="btn btn-primary self-end" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            <Play size={16} aria-hidden="true" />
            Run
          </button>
        </div>
      </div>
      {mutation.error ? <p className="mb-3 text-sm text-rose-700">{mutation.error.message}</p> : null}
      {result ? (
        <div className="space-y-4">
          <MetricGrid metrics={result.metrics} />
          {warnings.length ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
              <h3 className="mb-2 text-sm font-semibold text-amber-900">Warnings</h3>
              <ul className="list-disc space-y-1 pl-5 text-sm text-amber-900">
                {warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
