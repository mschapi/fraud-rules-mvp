import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Link } from "react-router-dom";

import { api } from "../api/client";

export function RulesDashboard() {
  const { data: rules = [], isLoading, error } = useQuery({ queryKey: ["rules"], queryFn: api.rules });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 rounded-lg border border-line bg-white/75 p-5 shadow-[0_18px_45px_rgba(16,24,40,0.06)]">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-ink">Rules dashboard</h2>
          <p className="mt-1 text-sm font-medium text-muted">Structured fraud rules ready for simulation and controlled deployment.</p>
        </div>
        <Link className="btn btn-primary" to="/rules/new">
          <Plus size={16} aria-hidden="true" />
          New rule
        </Link>
      </div>

      <section className="card overflow-hidden">
        {isLoading ? <div className="p-4 text-sm text-muted">Loading rules...</div> : null}
        {error ? <div className="p-4 text-sm text-rose-700">{error.message}</div> : null}
        {!isLoading && !rules.length ? (
          <div className="p-8 text-center">
            <h3 className="font-semibold">No rules yet</h3>
            <p className="mt-1 text-sm text-muted">Create the first rule from the builder or assistant.</p>
          </div>
        ) : null}
        {rules.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[840px] border-collapse text-left text-sm">
              <thead className="bg-[#faf4f6] text-xs uppercase text-muted">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Updated</th>
                  <th className="px-4 py-3">Last lift</th>
                  <th className="px-4 py-3">Fraud capture</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((rule) => (
                  <tr className="border-t border-line hover:bg-[#fff8fa]" key={rule.id}>
                    <td className="px-4 py-3 font-medium">{rule.name}</td>
                    <td className="px-4 py-3">{rule.status}</td>
                    <td className="px-4 py-3">{rule.action}</td>
                    <td className="px-4 py-3">{new Date(rule.updated_at).toLocaleString()}</td>
                    <td className="px-4 py-3">{rule.last_simulation?.lift ?? "-"}</td>
                    <td className="px-4 py-3">
                      {rule.last_simulation ? `${rule.last_simulation.captured_fraud_transactions_pct}%` : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <Link className="btn btn-secondary h-8" to={`/rules/${rule.id}`}>
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  );
}
