import { useMutation } from "@tanstack/react-query";
import { Bot, Database, MessageSquareText, Send, ShieldCheck, Upload, X } from "lucide-react";
import { useMemo, useState } from "react";

import { api } from "../api/client";
import type { AssistantChatResponse, AssistantContext } from "../api/types";

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
  response?: AssistantChatResponse;
};

const contextLabels: Record<AssistantContext, string> = {
  rules: "Rules",
  alerts: "Alerts",
  analytics: "Analytics",
};

function profileCsv(text: string): string {
  const rows = text.trim().split(/\r?\n/).filter(Boolean);
  const headers = rows[0]?.split(",").map((item) => item.trim()) ?? [];
  const sampleSize = Math.max(0, rows.length - 1);
  const usefulHeaders = headers.slice(0, 8).join(", ");
  return `${sampleSize} rows, ${headers.length} columns (${usefulHeaders})`;
}

export function FloatingAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [context, setContext] = useState<AssistantContext>("analytics");
  const [message, setMessage] = useState("");
  const [datasetSummary, setDatasetSummary] = useState("");
  const [dbSource, setDbSource] = useState("risk_warehouse.transactions_last_30d");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      text: "Hi. I can help inspect fraud patterns, suggest rules, or configure anomaly alerts.",
    },
  ]);
  const mutation = useMutation({
    mutationFn: api.assistantChat,
    onSuccess: (response, request) => {
      setMessages((items) => [
        ...items,
        { role: "user", text: request.message },
        { role: "assistant", text: response.answer, response },
      ]);
      setMessage("");
    },
  });
  const prompt = useMemo(() => {
    if (context === "analytics") return "Ask about patterns, cohorts, amounts, false positives, or rule ideas.";
    if (context === "alerts") return "Ask for an anomaly alarm over approval rate, score drift, or volume changes.";
    return "Ask for a fraud rule and Python preview.";
  }, [context]);

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {isOpen ? (
        <section className="flex h-[640px] w-[min(440px,calc(100vw-32px))] flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-[0_24px_80px_rgba(16,24,40,0.24)]">
          <header className="flex items-center justify-between gap-3 bg-slate-950 px-4 py-3 text-white">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-accent">
                <Bot size={22} aria-hidden="true" />
              </div>
              <div>
                <h2 className="font-extrabold">Fraud Copilot</h2>
                <p className="text-xs text-slate-300">Analytic assistant · demo mode</p>
              </div>
            </div>
            <button className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/10" onClick={() => setIsOpen(false)} aria-label="Close assistant">
              <X size={18} aria-hidden="true" />
            </button>
          </header>

          <div className="border-b border-line bg-[#fbfbfc] p-3">
            <div className="mb-3 grid grid-cols-3 gap-2">
              {Object.entries(contextLabels).map(([value, label]) => (
                <button
                  className={`h-9 rounded-full text-sm font-semibold transition ${
                    context === value ? "bg-accent text-white shadow-[0_8px_18px_rgba(130,0,32,0.18)]" : "bg-white text-slate-700 hover:bg-[#fff8fa]"
                  }`}
                  key={value}
                  type="button"
                  onClick={() => setContext(value as AssistantContext)}
                >
                  {label}
                </button>
              ))}
            </div>
            {context === "analytics" ? (
              <div className="grid gap-2">
                <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-line bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-accent/50">
                  <Upload size={16} aria-hidden="true" />
                  Upload CSV for context
                  <input
                    className="hidden"
                    type="file"
                    accept=".csv,text/csv"
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      setDatasetSummary(profileCsv(await file.text()));
                    }}
                  />
                </label>
                <div className="flex items-center gap-2">
                  <Database size={16} className="text-muted" aria-hidden="true" />
                  <input className="input h-9" value={dbSource} onChange={(event) => setDbSource(event.target.value)} />
                </div>
                <p className="text-xs text-muted">{datasetSummary || `DB source selected: ${dbSource}`}</p>
              </div>
            ) : null}
          </div>

          <div className="flex-1 space-y-3 overflow-auto bg-white p-4">
            {messages.map((item, index) => (
              <div className={`max-w-[92%] rounded-xl p-3 text-sm ${item.role === "user" ? "ml-auto bg-accent text-white" : "bg-slate-100 text-slate-800"}`} key={`${item.role}-${index}`}>
                <p>{item.text}</p>
                {item.response?.insights.length ? (
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
                    {item.response.insights.map((insight) => (
                      <li key={insight}>{insight}</li>
                    ))}
                  </ul>
                ) : null}
                {item.response?.python_code ? (
                  <pre className="mt-2 max-h-36 overflow-auto rounded-md bg-slate-950 p-2 text-xs text-white">{item.response.python_code}</pre>
                ) : null}
              </div>
            ))}
            {mutation.isPending ? <div className="rounded-xl bg-slate-100 p-3 text-sm text-muted">Thinking through fraud patterns...</div> : null}
          </div>

          <footer className="border-t border-line bg-[#fbfbfc] p-3">
            <p className="mb-2 text-xs font-semibold text-muted">{prompt}</p>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <textarea className="textarea min-h-16" value={message} onChange={(event) => setMessage(event.target.value)} />
              <button
                className="btn btn-primary h-full px-3"
                onClick={() =>
                  mutation.mutate({
                    message,
                    context,
                    dataset_summary: datasetSummary || (context === "analytics" ? `Connected source: ${dbSource}` : undefined),
                  })
                }
                disabled={!message.trim() || mutation.isPending}
                aria-label="Send message"
              >
                <Send size={18} aria-hidden="true" />
              </button>
            </div>
          </footer>
        </section>
      ) : (
        <button
          className="group flex h-16 items-center gap-3 rounded-full bg-slate-950 px-4 pr-5 text-white shadow-[0_18px_50px_rgba(16,24,40,0.28)] transition hover:-translate-y-0.5 hover:bg-accent"
          onClick={() => setIsOpen(true)}
        >
          <span className="grid h-11 w-11 place-items-center rounded-full bg-accent group-hover:bg-white/15">
            <ShieldCheck size={24} aria-hidden="true" />
          </span>
          <span className="text-left">
            <span className="block text-sm font-extrabold">Fraud Copilot</span>
            <span className="flex items-center gap-1 text-xs text-slate-300">
              <MessageSquareText size={13} aria-hidden="true" />
              Ask analytics
            </span>
          </span>
        </button>
      )}
    </div>
  );
}
