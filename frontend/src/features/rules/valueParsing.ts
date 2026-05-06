import type { Condition, Variable } from "../../api/types";
import type { RuleFormValues } from "./ruleFormSchema";

export function parseConditions(values: RuleFormValues, variables: Variable[]): Condition[] {
  return values.conditions.all.map((condition) => {
    const variable = variables.find((item) => item.name === condition.field);
    const raw = condition.value.trim();
    const isList = condition.operator === "in" || condition.operator === "not_in";

    if (isList) {
      return {
        ...condition,
        value: raw.split(",").map((item) => parseScalar(item.trim(), variable)),
      };
    }

    return {
      ...condition,
      value: parseScalar(raw, variable),
    };
  });
}

export function toFormValues(rule?: {
  name: string;
  description: string;
  action: "review" | "reject" | "approve";
  conditions: { all: Condition[] };
}): RuleFormValues {
  return {
    name: rule?.name ?? "",
    description: rule?.description ?? "",
    action: rule?.action ?? "review",
    conditions: {
      all:
        rule?.conditions.all.map((condition) => ({
          field: condition.field,
          operator: condition.operator,
          value: Array.isArray(condition.value) ? condition.value.join(", ") : String(condition.value),
        })) ?? [{ field: "user_age_days", operator: "<=", value: "7" }],
    },
  };
}

function parseScalar(raw: string, variable?: Variable) {
  if (variable?.type === "number") {
    return Number(raw);
  }
  if (variable?.type === "boolean") {
    return raw.toLowerCase() === "true";
  }
  return raw;
}
