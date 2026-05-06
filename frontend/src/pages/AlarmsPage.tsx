import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing, Plus, Save, Search, Siren } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { api } from "../api/client";
import type { Alarm, AlarmPayload, AlarmSeverity, AlarmStatus } from "../api/types";

const emptyAlarm: AlarmPayload = {
  name: "approval_rate_drop",
  description: "Alert when an operational metric moves outside expected anomaly bounds.",
  signal: "approval_rate_delta",
  operator: "<",
  threshold: -5,
  window: "15m",
  severity: "medium",
  channels: ["Slack #risk-alerts"],
};

const signals = [
  "approval_rate_delta",
  "checkout_tx_volume_zscore",
  "new_card_approval_rate_delta",
  "model_score_p95_delta",
  "manual_review_queue_zscore",
  "issuer_error_rate_delta",
];

function AlarmForm({
  initialAlarm,
  onSubmit,
  isSubmitting,
}: {
  initialAlarm: AlarmPayload & { status?: AlarmStatus };
  onSubmit: (payload: AlarmPayload & { status: AlarmStatus }) => void;
  isSubmitting?: boolean;
}) {
  const [draft, setDraft] = useState<AlarmPayload & { status: AlarmStatus }>({ ...initialAlarm, status: initialAlarm.status ?? "active" });

  useEffect(() => {
    setDraft({ ...initialAlarm, status: initialAlarm.status ?? "active" });
  }, [initialAlarm]);

  return (
    <form
      className="grid gap-4 lg:grid-cols-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(draft);
      }}
    >
      <label className="field lg:col-span-2">
        <span className="label">Alarm name</span>
        <input className="input" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
      </label>
      <label className="field">
        <span className="label">Severity</span>
        <select className="input" value={draft.severity} onChange={(event) => setDraft({ ...draft, severity: event.target.value as AlarmSeverity })}>
          <option value="low">low</option>
          <option value="medium">medium</option>
          <option value="high">high</option>
          <option value="critical">critical</option>
        </select>
      </label>
      <label className="field">
        <span className="label">Status</span>
        <select className="input" value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as AlarmStatus })}>
          <option value="active">active</option>
          <option value="draft">draft</option>
          <option value="muted">muted</option>
        </select>
      </label>
      <label className="field lg:col-span-2">
        <span className="label">Description</span>
        <textarea className="textarea" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
      </label>
      <label className="field">
        <span className="label">Signal</span>
        <select className="input" value={draft.signal} onChange={(event) => setDraft({ ...draft, signal: event.target.value })}>
          {signals.map((signal) => (
            <option key={signal} value={signal}>
              {signal}
            </option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-[0.8fr_1fr] gap-3">
        <label className="field">
          <span className="label">Operator</span>
          <select className="input" value={draft.operator} onChange={(event) => setDraft({ ...draft, operator: event.target.value as AlarmPayload["operator"] })}>
            <option value=">">&gt;</option>
            <option value=">=">&gt;=</option>
            <option value="<">&lt;</option>
            <option value="<=">&lt;=</option>
            <option value="outside_band">outside band</option>
          </select>
        </label>
        <label className="field">
          <span className="label">Threshold</span>
          <input className="input" type="number" value={draft.threshold} onChange={(event) => setDraft({ ...draft, threshold: Number(event.target.value) })} />
        </label>
      </div>
      <label className="field">
        <span className="label">Window</span>
        <select className="input" value={draft.window} onChange={(event) => setDraft({ ...draft, window: event.target.value })}>
          <option value="5m">5m</option>
          <option value="15m">15m</option>
          <option value="30m">30m</option>
          <option value="1h">1h</option>
          <option value="24h">24h</option>
        </select>
      </label>
      <label className="field lg:col-span-2">
        <span className="label">Channels</span>
        <input
          className="input"
          value={draft.channels.join(", ")}
          onChange={(event) => setDraft({ ...draft, channels: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) })}
        />
      </label>
      <div className="flex items-end">
        <button className="btn btn-primary w-full" type="submit" disabled={isSubmitting}>
          <Save size={16} aria-hidden="true" />
          Save alarm
        </button>
      </div>
    </form>
  );
}

export function AlarmsPage() {
  const [search, setSearch] = useState("");
  const [selectedAlarm, setSelectedAlarm] = useState<Alarm | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const queryClient = useQueryClient();
  const { data: alarms = [], isLoading, error } = useQuery({ queryKey: ["alarms"], queryFn: api.alarms });
  const createMutation = useMutation({
    mutationFn: api.createAlarm,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alarms"] });
      setIsCreating(false);
    },
  });
  const updateMutation = useMutation({
    mutationFn: (payload: AlarmPayload & { status: AlarmStatus }) => api.updateAlarm(selectedAlarm?.id ?? "", payload),
    onSuccess: (alarm) => {
      queryClient.invalidateQueries({ queryKey: ["alarms"] });
      setSelectedAlarm(alarm);
    },
  });
  const filteredAlarms = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return alarms;
    return alarms.filter((alarm) => `${alarm.name} ${alarm.description} ${alarm.signal}`.toLowerCase().includes(needle));
  }, [alarms, search]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 rounded-lg border border-line bg-white/75 p-5 shadow-[0_18px_45px_rgba(16,24,40,0.06)] lg:flex-row lg:items-start">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-ink">Alarms</h2>
          <p className="mt-1 text-sm font-medium text-muted">Configure anomaly alerts over operational and risk signals.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setIsCreating(true); setSelectedAlarm(null); }}>
          <Plus size={16} aria-hidden="true" />
          New alarm
        </button>
      </div>

      <section className="card overflow-hidden">
        <div className="border-b border-line bg-white p-4">
          <label className="field max-w-xl">
            <span className="label flex items-center gap-2">
              <Search size={15} aria-hidden="true" />
              Search alarms
            </span>
            <input className="input" placeholder="Search by name, description, or signal" value={search} onChange={(event) => setSearch(event.target.value)} />
          </label>
        </div>
        {isLoading ? <div className="p-4 text-sm text-muted">Loading alarms...</div> : null}
        {error ? <div className="p-4 text-sm text-rose-700">{error.message}</div> : null}
        {filteredAlarms.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-left text-sm">
              <thead className="bg-[#faf4f6] text-xs uppercase text-muted">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Signal</th>
                  <th className="px-4 py-3">Severity</th>
                  <th className="px-4 py-3">Window</th>
                  <th className="px-4 py-3">Anomaly rate</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAlarms.map((alarm) => (
                  <tr className="border-t border-line hover:bg-[#fff8fa]" key={alarm.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium">{alarm.name}</p>
                      <p className="text-xs text-muted">{alarm.description}</p>
                    </td>
                    <td className="px-4 py-3">{alarm.signal}</td>
                    <td className="px-4 py-3">{alarm.severity}</td>
                    <td className="px-4 py-3">{alarm.window}</td>
                    <td className="px-4 py-3">{alarm.anomaly_rate_pct}%</td>
                    <td className="px-4 py-3">{alarm.status}</td>
                    <td className="px-4 py-3">
                      <button className="btn btn-secondary h-8" onClick={() => { setSelectedAlarm(alarm); setIsCreating(false); }}>
                        Open
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      {isCreating || selectedAlarm ? (
        <section className="card p-4">
          <div className="mb-4 flex items-center gap-2">
            {selectedAlarm ? <Siren size={18} className="text-accent" aria-hidden="true" /> : <BellRing size={18} className="text-accent" aria-hidden="true" />}
            <h2 className="font-semibold">{selectedAlarm ? selectedAlarm.name : "New alarm"}</h2>
          </div>
          <AlarmForm
            initialAlarm={selectedAlarm ?? emptyAlarm}
            onSubmit={(payload) => (selectedAlarm ? updateMutation.mutate(payload) : createMutation.mutate(payload))}
            isSubmitting={createMutation.isPending || updateMutation.isPending}
          />
        </section>
      ) : null}
    </div>
  );
}
