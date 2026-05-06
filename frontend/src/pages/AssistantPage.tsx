import { useMutation, useQuery } from "@tanstack/react-query";
import { Bot, Code2, Database, Send, Upload, Wand2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { api } from "../api/client";
import type { AiSuggestion, AlarmPayload, AlarmSeverity, RulePayload } from "../api/types";
import { RuleForm } from "../features/rules/RuleForm";
import { ruleToPython } from "../features/rules/pythonGenerator";
import { ModeSwitch, type WorkMode } from "../ui/ModeSwitch";

function alarmToPython(alarm: AlarmPayload): string {
  const operator = alarm.operator === "outside_band" ? "outside expected band" : `${alarm.operator} ${alarm.threshold}`;
  return `def evaluate_${alarm.name || "alarm"}(signal):\n    \"\"\"${alarm.description || "Generated anomaly alarm."}\"\"\"\n    value = signal.get(${JSON.stringify(alarm.signal)})\n    triggered = value ${alarm.operator === "outside_band" ? "< signal.get('lower_band') or value > signal.get('upper_band')" : `${alarm.operator} ${alarm.threshold}`}\n    if triggered:\n        return {\n            \"severity\": ${JSON.stringify(alarm.severity)},\n            \"window\": ${JSON.stringify(alarm.window)},\n            \"condition\": ${JSON.stringify(`${alarm.signal} ${operator}`)},\n            \"channels\": ${JSON.stringify(alarm.channels)},\n        }\n    return None\n`;
}

const defaultAlarm: AlarmPayload = {
  name: "model_score_distribution_shift",
  description: "Alert when anomaly signals move outside the expected range.",
  signal: "model_score_p95_delta",
  operator: ">",
  threshold: 10,
  window: "30m",
  severity: "high",
  channels: ["Slack #risk-alerts"],
};

export function AssistantPage() {
  const [message, setMessage] = useState("");
  const [mode, setMode] = useState<WorkMode>("rules");
  const [suggestion, setSuggestion] = useState<AiSuggestion | null>(null);
  const [editableRule, setEditableRule] = useState<RulePayload | null>(null);
  const [editableAlarm, setEditableAlarm] = useState<AlarmPayload | null>(null);
  const [datasetSummary, setDatasetSummary] = useState("");
  const [dbSource, setDbSource] = useState("risk_warehouse.transactions_last_30d");
  const navigate = useNavigate();
  const variablesQuery = useQuery({ queryKey: ["variables"], queryFn: api.variables });
  const mutation = useMutation({
    mutationFn: api.suggestRule,
    onSuccess: (nextSuggestion) => {
      setSuggestion(nextSuggestion);
      setEditableRule(nextSuggestion.proposed_rule);
    },
  });

  function suggestAlarm(request: string) {
    const lowered = request.toLowerCase();
    const alarm: AlarmPayload = {
      ...defaultAlarm,
      name: lowered.includes("approval") ? "approval_rate_drop_alarm" : lowered.includes("volume") ? "volume_zscore_alarm" : "model_score_shift_alarm",
      signal: lowered.includes("approval") ? "approval_rate_delta" : lowered.includes("volume") ? "checkout_tx_volume_zscore" : "model_score_p95_delta",
      operator: lowered.includes("drop") || lowered.includes("caida") || lowered.includes("baja") ? "<" : ">",
      threshold: lowered.includes("critical") ? 15 : lowered.includes("volume") ? -2.5 : 10,
      severity: lowered.includes("critical") ? "critical" : "high",
    };
    setEditableAlarm(alarm);
    setSuggestion(null);
  }

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-line bg-white/75 p-5 shadow-[0_18px_45px_rgba(16,24,40,0.06)]">
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-ink">Analytic assistant workbench</h2>
            <p className="mt-1 text-sm font-medium text-muted">
              Upload a CSV or select a database source, then ask for fraud insights, rule ideas, or anomaly alerts.
            </p>
          </div>
          <ModeSwitch value={mode} onChange={(nextMode) => { setMode(nextMode); setSuggestion(null); setEditableRule(null); setEditableAlarm(null); }} />
        </div>
      </div>

      <section className="card p-4">
        <div className="mb-4 grid gap-3 lg:grid-cols-2">
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-line bg-white p-4 text-sm font-semibold text-slate-700 hover:border-accent/50">
            <Upload size={18} className="text-accent" aria-hidden="true" />
            Upload CSV context
            <input
              className="hidden"
              type="file"
              accept=".csv,text/csv"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                const rows = (await file.text()).trim().split(/\r?\n/).filter(Boolean);
                const columns = rows[0]?.split(",").length ?? 0;
                setDatasetSummary(`${rows.length - 1} rows and ${columns} columns from ${file.name}`);
              }}
            />
          </label>
          <label className="field rounded-lg border border-line bg-white p-4">
            <span className="label flex items-center gap-2">
              <Database size={16} className="text-accent" aria-hidden="true" />
              Database source
            </span>
            <input className="input" value={dbSource} onChange={(event) => setDbSource(event.target.value)} />
          </label>
        </div>
        {datasetSummary ? <p className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">{datasetSummary}</p> : null}
        <div className="mb-4 flex items-start gap-3 rounded-md border border-[#ead3da] bg-[#fff8fa] p-3">
          <Bot className="mt-0.5 text-accent" size={20} aria-hidden="true" />
          <p className="text-sm font-medium text-slate-700">
            {mode === "rules"
              ? 'Try: "generate Python to reject new cards with model score above 0.75" or "usuarios nuevos con muchas compras".'
              : 'Try: "critical alarm for approval rate drop" or "alert on checkout volume anomaly".'}
          </p>
        </div>
        <label className="field">
          <span className="label">Request</span>
          <textarea className="textarea" value={message} onChange={(event) => setMessage(event.target.value)} />
        </label>
        <div className="mt-3 flex justify-end">
          <button className="btn btn-primary" onClick={() => (mode === "rules" ? mutation.mutate(message) : suggestAlarm(message))} disabled={!message.trim() || mutation.isPending}>
            <Send size={16} aria-hidden="true" />
            Ask workbench
          </button>
        </div>
        {mutation.error ? <p className="mt-3 text-sm text-rose-700">{mutation.error.message}</p> : null}
      </section>

      {mode === "rules" && suggestion ? (
        <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="card p-4">
          <div className="mb-3 flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
            <div>
              <h2 className="font-semibold">Editable proposed rule</h2>
              <p className="text-sm text-muted">{suggestion.explanation}</p>
            </div>
            <button className="btn btn-primary" onClick={() => editableRule && navigate("/rules/new", { state: { proposedRule: editableRule } })}>
              <Wand2 size={16} aria-hidden="true" />
              Open in builder
            </button>
          </div>
          {variablesQuery.data && editableRule ? (
            <RuleForm
              variables={variablesQuery.data}
              initialRule={editableRule}
              submitLabel="Update Python preview"
              onSubmit={setEditableRule}
            />
          ) : (
            <p className="text-sm text-muted">Loading variables...</p>
          )}
          {suggestion.warnings.length ? (
            <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              {suggestion.warnings.join(" ")}
            </div>
          ) : null}
          </div>
          <div className="card p-4">
            <div className="mb-3 flex items-center gap-2">
              <Code2 size={18} className="text-accent" aria-hidden="true" />
              <h2 className="font-semibold">Generated Python</h2>
            </div>
            <pre className="min-h-[360px] overflow-auto rounded-md border border-slate-900 bg-slate-950 p-4 text-sm text-slate-50">
              {editableRule ? ruleToPython(editableRule) : suggestion.python_code}
            </pre>
          </div>
        </section>
      ) : null}
      {mode === "alerts" && editableAlarm ? (
        <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="card p-4">
            <div className="mb-3 flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
              <div>
                <h2 className="font-semibold">Editable alarm configuration</h2>
                <p className="text-sm text-muted">Demo assistant maps the request to anomaly signal, threshold, severity, window, and channels.</p>
              </div>
              <button className="btn btn-primary" onClick={() => navigate("/alarms")}>
                <Wand2 size={16} aria-hidden="true" />
                Open alarms
              </button>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <label className="field">
                <span className="label">Alarm name</span>
                <input className="input" value={editableAlarm.name} onChange={(event) => setEditableAlarm({ ...editableAlarm, name: event.target.value })} />
              </label>
              <label className="field">
                <span className="label">Signal</span>
                <input className="input" value={editableAlarm.signal} onChange={(event) => setEditableAlarm({ ...editableAlarm, signal: event.target.value })} />
              </label>
              <label className="field lg:col-span-2">
                <span className="label">Description</span>
                <textarea className="textarea" value={editableAlarm.description} onChange={(event) => setEditableAlarm({ ...editableAlarm, description: event.target.value })} />
              </label>
              <label className="field">
                <span className="label">Severity</span>
                <select className="input" value={editableAlarm.severity} onChange={(event) => setEditableAlarm({ ...editableAlarm, severity: event.target.value as AlarmSeverity })}>
                  <option value="low">low</option>
                  <option value="medium">medium</option>
                  <option value="high">high</option>
                  <option value="critical">critical</option>
                </select>
              </label>
              <label className="field">
                <span className="label">Window</span>
                <input className="input" value={editableAlarm.window} onChange={(event) => setEditableAlarm({ ...editableAlarm, window: event.target.value })} />
              </label>
              <label className="field">
                <span className="label">Threshold</span>
                <input className="input" type="number" value={editableAlarm.threshold} onChange={(event) => setEditableAlarm({ ...editableAlarm, threshold: Number(event.target.value) })} />
              </label>
              <label className="field">
                <span className="label">Channels</span>
                <input
                  className="input"
                  value={editableAlarm.channels.join(", ")}
                  onChange={(event) => setEditableAlarm({ ...editableAlarm, channels: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) })}
                />
              </label>
            </div>
          </div>
          <div className="card p-4">
            <div className="mb-3 flex items-center gap-2">
              <Code2 size={18} className="text-accent" aria-hidden="true" />
              <h2 className="font-semibold">Generated alarm Python</h2>
            </div>
            <pre className="min-h-[360px] overflow-auto rounded-md border border-slate-900 bg-slate-950 p-4 text-sm text-slate-50">
              {alarmToPython(editableAlarm)}
            </pre>
          </div>
        </section>
      ) : null}
    </div>
  );
}
