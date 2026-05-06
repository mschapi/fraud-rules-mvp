import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, GitBranch, ShieldAlert, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";

import { api } from "../api/client";
import type { Alarm, Rule } from "../api/types";
import { ModeSwitch, type WorkMode } from "../ui/ModeSwitch";

type Timeframe = "7d" | "14d" | "30d";

const timeframeLabels: Record<Timeframe, string> = {
  "7d": "Last 7 days",
  "14d": "Last 14 days",
  "30d": "Last 30 days",
};

function rejectionShare(rule: Rule): number {
  const baseline = rule.action === "reject" ? 4.8 : rule.action === "review" ? 2.4 : 0.7;
  return Number((rule.last_simulation?.matched_transactions_pct ?? baseline).toFixed(2));
}

function severityWeight(alarm: Alarm): number {
  const weights = { low: 0.8, medium: 1.4, high: 2.1, critical: 3.2 };
  return Number((alarm.anomaly_rate_pct * weights[alarm.severity]).toFixed(2));
}

export function OverviewPage() {
  const [mode, setMode] = useState<WorkMode>("rules");
  const [timeframe, setTimeframe] = useState<Timeframe>("7d");
  const { data: rules = [], isLoading, error } = useQuery({ queryKey: ["rules"], queryFn: api.rules });
  const { data: alarms = [], isLoading: alarmsLoading, error: alarmsError } = useQuery({ queryKey: ["alarms"], queryFn: api.alarms });

  const rows = useMemo(
    () =>
      rules.map((rule, index) => {
        const rejected = rejectionShare(rule);
        const approved = Number(Math.max(0, 100 - rejected).toFixed(2));
        return {
          rule,
          rejected,
          approved,
          volume: rule.last_simulation?.matched_transactions ?? 80 + index * 34,
        };
      }),
    [rules],
  );
  const totalRejected = Number(rows.reduce((sum, row) => sum + row.rejected, 0).toFixed(2));
  const approvedAfterRules = Number(Math.max(0, 100 - totalRejected).toFixed(2));
  const alarmRows = useMemo(
    () =>
      alarms.map((alarm) => ({
        alarm,
        anomaly: severityWeight(alarm),
        healthy: Number(Math.max(0, 100 - severityWeight(alarm)).toFixed(2)),
      })),
    [alarms],
  );
  const totalAnomaly = Number(alarmRows.reduce((sum, row) => sum + row.anomaly, 0).toFixed(2));
  const healthySignals = Number(Math.max(0, 100 - totalAnomaly).toFixed(2));

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-4 rounded-lg border border-line bg-white/75 p-5 shadow-[0_18px_45px_rgba(16,24,40,0.06)] lg:flex-row lg:items-start">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-ink">Overview</h2>
          <p className="mt-1 text-sm font-medium text-muted">
            {mode === "rules" ? "Rule decision flow and approval impact by timeframe." : "Alert coverage and anomaly pressure by timeframe."}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <ModeSwitch value={mode} onChange={setMode} />
          <label className="field min-w-48">
            <span className="label flex items-center gap-2">
              <SlidersHorizontal size={15} aria-hidden="true" />
              Timeframe
            </span>
            <select className="input" value={timeframe} onChange={(event) => setTimeframe(event.target.value as Timeframe)}>
              {Object.entries(timeframeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {mode === "rules" && isLoading ? <p className="text-sm text-muted">Loading overview...</p> : null}
      {mode === "alerts" && alarmsLoading ? <p className="text-sm text-muted">Loading alert overview...</p> : null}
      {mode === "rules" && error ? <p className="text-sm text-rose-700">{error.message}</p> : null}
      {mode === "alerts" && alarmsError ? <p className="text-sm text-rose-700">{alarmsError.message}</p> : null}

      <section className="card p-5">
        {mode === "rules" ? (
          <div className="grid gap-4 lg:grid-cols-[1fr_1.3fr_1fr] lg:items-center">
          <div className="rounded-lg border border-line bg-white p-4">
            <p className="text-sm font-semibold text-muted">{timeframeLabels[timeframe]}</p>
            <p className="mt-2 text-4xl font-extrabold text-ink">100%</p>
            <p className="text-sm text-muted">Incoming transactions</p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2 text-sm font-semibold text-muted">
              <GitBranch size={16} aria-hidden="true" />
              Rule tree
            </div>
            {rows.map(({ rule, rejected, approved, volume }) => (
              <div className="rounded-lg border border-line bg-[#fbfbfc] p-3" key={rule.id}>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ink">{rule.name}</p>
                    <p className="text-xs text-muted">{volume.toLocaleString()} matched transactions</p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-accent">{rule.action}</span>
                </div>
                <div className="grid grid-cols-[minmax(42px,0.4fr)_1fr_minmax(42px,0.4fr)] items-center gap-2 text-xs font-semibold">
                  <span className="text-rose-700">{rejected}%</span>
                  <div className="h-3 overflow-hidden rounded-full bg-emerald-100">
                    <div className="h-full bg-rose-600" style={{ width: `${Math.min(100, rejected)}%` }} />
                  </div>
                  <span className="text-right text-emerald-700">{approved}%</span>
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-3">
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-rose-800">
                <ShieldAlert size={16} aria-hidden="true" />
                Rejected / reviewed
              </div>
              <p className="mt-2 text-3xl font-extrabold text-rose-900">{totalRejected}%</p>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
                <CheckCircle2 size={16} aria-hidden="true" />
                Approved
              </div>
              <p className="mt-2 text-3xl font-extrabold text-emerald-900">{approvedAfterRules}%</p>
            </div>
          </div>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[1fr_1.3fr_1fr] lg:items-center">
            <div className="rounded-lg border border-line bg-white p-4">
              <p className="text-sm font-semibold text-muted">{timeframeLabels[timeframe]}</p>
              <p className="mt-2 text-4xl font-extrabold text-ink">{alarms.length}</p>
              <p className="text-sm text-muted">Configured anomaly alarms</p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2 text-sm font-semibold text-muted">
                <GitBranch size={16} aria-hidden="true" />
                Alert tree
              </div>
              {alarmRows.map(({ alarm, anomaly, healthy }) => (
                <div className="rounded-lg border border-line bg-[#fbfbfc] p-3" key={alarm.id}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-ink">{alarm.name}</p>
                      <p className="text-xs text-muted">{alarm.signal} · {alarm.monitored_events.toLocaleString()} monitored events</p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-accent">{alarm.severity}</span>
                  </div>
                  <div className="grid grid-cols-[minmax(42px,0.4fr)_1fr_minmax(42px,0.4fr)] items-center gap-2 text-xs font-semibold">
                    <span className="text-rose-700">{anomaly}%</span>
                    <div className="h-3 overflow-hidden rounded-full bg-emerald-100">
                      <div className="h-full bg-rose-600" style={{ width: `${Math.min(100, anomaly)}%` }} />
                    </div>
                    <span className="text-right text-emerald-700">{healthy}%</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="grid gap-3">
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-rose-800">
                  <ShieldAlert size={16} aria-hidden="true" />
                  Anomaly pressure
                </div>
                <p className="mt-2 text-3xl font-extrabold text-rose-900">{totalAnomaly}%</p>
              </div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
                  <CheckCircle2 size={16} aria-hidden="true" />
                  Healthy signals
                </div>
                <p className="mt-2 text-3xl font-extrabold text-emerald-900">{healthySignals}%</p>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
