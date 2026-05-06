import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GitPullRequest } from "lucide-react";
import { useState } from "react";
import { useParams } from "react-router-dom";

import { api } from "../api/client";
import type { PrResponse } from "../api/types";
import { RuleForm } from "../features/rules/RuleForm";
import { SimulationPanel } from "../features/rules/SimulationPanel";

export function RuleDetailPage() {
  const { id = "" } = useParams();
  const queryClient = useQueryClient();
  const [pr, setPr] = useState<PrResponse | null>(null);
  const variablesQuery = useQuery({ queryKey: ["variables"], queryFn: api.variables });
  const ruleQuery = useQuery({ queryKey: ["rule", id], queryFn: () => api.rule(id), enabled: Boolean(id) });
  const updateMutation = useMutation({
    mutationFn: (payload: Parameters<typeof api.updateRule>[1]) => api.updateRule(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rules"] });
      queryClient.invalidateQueries({ queryKey: ["rule", id] });
    },
  });
  const prMutation = useMutation({
    mutationFn: () => api.createPr(id),
    onSuccess: setPr,
  });

  if (ruleQuery.isLoading || variablesQuery.isLoading) {
    return <p className="text-sm text-muted">Loading rule...</p>;
  }

  if (ruleQuery.error || variablesQuery.error || !ruleQuery.data || !variablesQuery.data) {
    return <p className="text-sm text-rose-700">Could not load this rule.</p>;
  }

  const rule = ruleQuery.data;

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 rounded-lg border border-line bg-white/75 p-5 shadow-[0_18px_45px_rgba(16,24,40,0.06)] lg:flex-row lg:items-start">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-ink">{rule.name}</h2>
          <p className="mt-1 text-sm font-medium text-muted">Edit, simulate, and prepare a deployment payload.</p>
        </div>
        <button className="btn btn-primary" onClick={() => prMutation.mutate()} disabled={prMutation.isPending}>
          <GitPullRequest size={16} aria-hidden="true" />
          Create PR
        </button>
      </div>

      <section className="card p-4">
        <RuleForm
          variables={variablesQuery.data}
          initialRule={rule}
          submitLabel="Save changes"
          onSubmit={(payload) => updateMutation.mutate({ ...payload, status: rule.status })}
          isSubmitting={updateMutation.isPending}
        />
        {updateMutation.error ? <p className="mt-3 text-sm text-rose-700">{updateMutation.error.message}</p> : null}
      </section>

      <SimulationPanel
        ruleId={id}
        onComplete={() => {
          queryClient.invalidateQueries({ queryKey: ["rules"] });
          queryClient.invalidateQueries({ queryKey: ["rule", id] });
        }}
      />

      {prMutation.error ? <p className="text-sm text-rose-700">{prMutation.error.message}</p> : null}
      {pr ? (
        <section className="card p-4">
          <div className="mb-3">
            <h2 className="font-semibold">Mock pull request</h2>
            <a className="text-sm text-accent underline" href={pr.pr_url} target="_blank" rel="noreferrer">
              {pr.pr_url}
            </a>
          </div>
          <pre className="max-h-[420px] overflow-auto rounded-md border border-slate-900 bg-slate-950 p-4 text-sm text-slate-50">{pr.yaml_content}</pre>
        </section>
      ) : null}
    </div>
  );
}
