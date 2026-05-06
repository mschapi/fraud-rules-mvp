from typing import Any

import yaml

from app.schemas import RuleBase, SimulationMetrics


class RuleYamlService:
    def to_yaml(self, rule_id: str, rule: RuleBase, last_simulation: SimulationMetrics | None = None) -> str:
        payload: dict[str, Any] = {
            "id": rule_id,
            "name": self._humanize_name(rule.name),
            "description": rule.description,
            "status": "active",
            "action": rule.action,
            "conditions": rule.conditions.model_dump(),
            "metadata": {
                "generated_by": "fraud-rules-mvp",
            },
        }
        if last_simulation:
            payload["metadata"]["last_simulation"] = {
                "matched_transactions": last_simulation.matched_transactions,
                "captured_fraud_transactions_pct": last_simulation.captured_fraud_transactions_pct,
                "captured_fraud_amount_pct": last_simulation.captured_fraud_amount_pct,
                "lift": last_simulation.lift,
            }
        return yaml.safe_dump(payload, sort_keys=False, allow_unicode=False)

    def _humanize_name(self, name: str) -> str:
        return name.replace("_", " ").strip().capitalize()

