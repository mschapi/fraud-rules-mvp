import type { Condition, RulePayload } from "../../api/types";

function pythonValue(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(pythonValue).join(", ")}]`;
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "True" : "False";
  return String(value);
}

function conditionToPython(condition: Condition): string {
  const left = `tx.get(${JSON.stringify(condition.field)})`;
  const right = pythonValue(condition.value);

  if (condition.operator === "in") return `${left} in ${right}`;
  if (condition.operator === "not_in") return `${left} not in ${right}`;
  return `${left} ${condition.operator} ${right}`;
}

export function ruleToPython(rule: RulePayload): string {
  const conditions = rule.conditions.all.map(conditionToPython);
  const body = conditions.length ? conditions.map((condition) => `        ${condition},`).join("\n") : "        False,";

  return `def evaluate_${rule.name || "rule"}(tx):\n    \"\"\"${rule.description || "Generated fraud rule."}\"\"\"\n    matches = all([\n${body}\n    ])\n    if matches:\n        return ${JSON.stringify(rule.action)}\n    return \"approve\"\n`;
}
