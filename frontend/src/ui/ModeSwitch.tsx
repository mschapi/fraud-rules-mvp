import { BellRing, ListChecks } from "lucide-react";

export type WorkMode = "rules" | "alerts";

export function ModeSwitch({ value, onChange }: { value: WorkMode; onChange: (value: WorkMode) => void }) {
  return (
    <div className="inline-grid grid-cols-2 rounded-full border border-line bg-white p-1 shadow-sm">
      <button
        className={`btn h-9 rounded-full px-3 ${value === "rules" ? "btn-primary" : "border-transparent bg-transparent text-slate-700 hover:bg-[#fff8fa]"}`}
        type="button"
        onClick={() => onChange("rules")}
      >
        <ListChecks size={15} aria-hidden="true" />
        Rules
      </button>
      <button
        className={`btn h-9 rounded-full px-3 ${value === "alerts" ? "btn-primary" : "border-transparent bg-transparent text-slate-700 hover:bg-[#fff8fa]"}`}
        type="button"
        onClick={() => onChange("alerts")}
      >
        <BellRing size={15} aria-hidden="true" />
        Alerts
      </button>
    </div>
  );
}
