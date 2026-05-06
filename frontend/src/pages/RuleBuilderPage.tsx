import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";

import { api } from "../api/client";
import type { RulePayload } from "../api/types";
import { RuleForm } from "../features/rules/RuleForm";

export function RuleBuilderPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const initialRule = (location.state as { proposedRule?: RulePayload } | null)?.proposedRule;
  const variablesQuery = useQuery({ queryKey: ["variables"], queryFn: api.variables });
  const createMutation = useMutation({
    mutationFn: api.createRule,
    onSuccess: (rule) => {
      queryClient.invalidateQueries({ queryKey: ["rules"] });
      navigate(`/rules/${rule.id}`);
    },
  });

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-line bg-white/75 p-5 shadow-[0_18px_45px_rgba(16,24,40,0.06)]">
        <h2 className="text-3xl font-extrabold tracking-tight text-ink">Rule builder</h2>
        <p className="mt-1 text-sm font-medium text-muted">Create a structured rule using only controlled fields and operators.</p>
      </div>
      <section className="card p-4">
        {variablesQuery.data ? (
          <RuleForm
            variables={variablesQuery.data}
            initialRule={initialRule}
            onSubmit={(payload) => createMutation.mutate(payload)}
            isSubmitting={createMutation.isPending}
          />
        ) : (
          <p className="text-sm text-muted">Loading variables...</p>
        )}
        {createMutation.error ? <p className="mt-3 text-sm text-rose-700">{createMutation.error.message}</p> : null}
      </section>
    </div>
  );
}
