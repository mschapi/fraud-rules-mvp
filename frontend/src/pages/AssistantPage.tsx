import { useMutation, useQuery } from "@tanstack/react-query";
import { Bot, Code2, Send, Wand2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { api } from "../api/client";
import type { AiSuggestion, RulePayload } from "../api/types";
import { RuleForm } from "../features/rules/RuleForm";
import { ruleToPython } from "../features/rules/pythonGenerator";

export function AssistantPage() {
  const [message, setMessage] = useState("");
  const [suggestion, setSuggestion] = useState<AiSuggestion | null>(null);
  const [editableRule, setEditableRule] = useState<RulePayload | null>(null);
  const navigate = useNavigate();
  const variablesQuery = useQuery({ queryKey: ["variables"], queryFn: api.variables });
  const mutation = useMutation({
    mutationFn: api.suggestRule,
    onSuccess: (nextSuggestion) => {
      setSuggestion(nextSuggestion);
      setEditableRule(nextSuggestion.proposed_rule);
    },
  });

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-line bg-white/75 p-5 shadow-[0_18px_45px_rgba(16,24,40,0.06)]">
        <h2 className="text-3xl font-extrabold tracking-tight text-ink">AI assistant</h2>
        <p className="mt-1 text-sm font-medium text-muted">Turn plain language into a controlled structured draft rule.</p>
      </div>

      <section className="card p-4">
        <div className="mb-4 flex items-start gap-3 rounded-md border border-[#ead3da] bg-[#fff8fa] p-3">
          <Bot className="mt-0.5 text-accent" size={20} aria-hidden="true" />
          <p className="text-sm font-medium text-slate-700">
            Try: "generate Python to reject new cards with model score above 0.75" or "usuarios nuevos con muchas compras".
          </p>
        </div>
        <label className="field">
          <span className="label">Request</span>
          <textarea className="textarea" value={message} onChange={(event) => setMessage(event.target.value)} />
        </label>
        <div className="mt-3 flex justify-end">
          <button className="btn btn-primary" onClick={() => mutation.mutate(message)} disabled={!message.trim() || mutation.isPending}>
            <Send size={16} aria-hidden="true" />
            Ask assistant
          </button>
        </div>
        {mutation.error ? <p className="mt-3 text-sm text-rose-700">{mutation.error.message}</p> : null}
      </section>

      {suggestion ? (
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
    </div>
  );
}
