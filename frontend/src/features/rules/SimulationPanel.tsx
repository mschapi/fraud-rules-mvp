import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock3, Play, SearchCode } from "lucide-react";
import { useMemo, useState } from "react";

import { api } from "../../api/client";
import type { SimulationMode, SimulationResponse, SimulationRun } from "../../api/types";
import { MetricGrid } from "../../ui/MetricGrid";

function isoDate(daysAgo: number) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

export function SimulationPanel({ ruleId, onComplete }: { ruleId: string; onComplete?: () => void }) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<SimulationMode>("date_range");
  const [startDate, setStartDate] = useState(isoDate(30));
  const [endDate, setEndDate] = useState(isoDate(0));
  const [queryText, setQueryText] = useState("date >= '2026-04-01' and card_id in ('card_123', 'card_456')");
  const [result, setResult] = useState<SimulationResponse | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedRun, setSelectedRun] = useState<SimulationRun | null>(null);

  const historyQuery = useQuery({
    queryKey: ["simulation-history", ruleId],
    queryFn: () => api.simulationHistory(ruleId),
  });

  const mutation = useMutation({
    mutationFn: () =>
      api.simulate(
        ruleId,
        mode === "query"
          ? { query_text: queryText }
          : { start_date: startDate, end_date: endDate },
      ),
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ["simulation-history", ruleId] });
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
        <div className="flex flex-wrap items-end gap-2">
          <button className="btn btn-secondary" type="button" onClick={() => setShowHistory((value) => !value)}>
            <Clock3 size={16} aria-hidden="true" />
            History
          </button>
        </div>
      </div>
      <div className="mb-4 rounded-lg border border-line bg-white p-3">
        <div className="mb-3 flex flex-wrap gap-2">
          <button className={`btn ${mode === "date_range" ? "btn-primary" : "btn-secondary"}`} type="button" onClick={() => setMode("date_range")}>
            Date range
          </button>
          <button className={`btn ${mode === "query" ? "btn-primary" : "btn-secondary"}`} type="button" onClick={() => setMode("query")}>
            <SearchCode size={16} aria-hidden="true" />
            Query
          </button>
        </div>
        {mode === "date_range" ? (
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
        ) : (
          <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
            <label className="field">
              <span className="label">Input query</span>
              <textarea
                className="textarea min-h-20"
                value={queryText}
                onChange={(event) => setQueryText(event.target.value)}
                placeholder="date between '2026-04-01' and '2026-04-07' and user_id in (...)"
              />
            </label>
            <button className="btn btn-primary" onClick={() => mutation.mutate()} disabled={mutation.isPending || !queryText.trim()}>
              <Play size={16} aria-hidden="true" />
              Run query
            </button>
          </div>
        )}
      </div>
      {mutation.error ? <p className="mb-3 text-sm text-rose-700">{mutation.error.message}</p> : null}
      {showHistory ? (
        <div className="mb-4 rounded-lg border border-line bg-[#fbfbfc] p-3">
          <h3 className="mb-3 font-semibold">Simulation history</h3>
          {historyQuery.data?.length ? (
            <div className="grid gap-3 lg:grid-cols-[0.8fr_1.2fr]">
              <div className="space-y-2">
                {historyQuery.data.map((run) => (
                  <button
                    className={`w-full rounded-md border p-3 text-left text-sm transition ${
                      selectedRun?.id === run.id ? "border-accent bg-[#fff8fa]" : "border-line bg-white hover:border-accent/40"
                    }`}
                    type="button"
                    key={run.id}
                    onClick={() => setSelectedRun(run)}
                  >
                    <span className="block font-semibold">{new Date(run.created_at).toLocaleString()}</span>
                    <span className="text-muted">
                      {run.mode === "query" ? "Query" : `${run.start_date} to ${run.end_date}`} · Bloqueo {run.metrics.matched_transactions_pct}%
                    </span>
                  </button>
                ))}
              </div>
              <div className="rounded-md border border-line bg-white p-3">
                {selectedRun ? (
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-semibold">Run detail</h4>
                      <p className="text-sm text-muted">
                        {selectedRun.mode === "query" ? selectedRun.query_text : `${selectedRun.start_date} to ${selectedRun.end_date}`}
                      </p>
                    </div>
                    <MetricGrid metrics={selectedRun.metrics} />
                  </div>
                ) : (
                  <p className="text-sm text-muted">Select a historical run to inspect details.</p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted">No simulation runs yet.</p>
          )}
        </div>
      ) : null}
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
