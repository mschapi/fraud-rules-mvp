from fastapi import HTTPException

from app.catalog import CATALOG_BY_NAME
from app.schemas import Condition, RuleBase

VALID_ACTIONS = {"review", "reject", "approve"}


class RuleValidationService:
    def validate_rule(self, rule: RuleBase) -> None:
        if rule.action not in VALID_ACTIONS:
            raise HTTPException(status_code=422, detail="Unsupported rule action.")
        if not rule.conditions.all:
            raise HTTPException(status_code=422, detail="Rule must contain at least one condition.")

        for condition in rule.conditions.all:
            self._validate_condition(condition)

    def _validate_condition(self, condition: Condition) -> None:
        variable = CATALOG_BY_NAME.get(condition.field)
        if variable is None:
            raise HTTPException(status_code=422, detail=f"Unknown variable: {condition.field}")
        if condition.operator not in variable["allowed_operators"]:
            raise HTTPException(
                status_code=422,
                detail=f"Operator {condition.operator} is not allowed for {condition.field}",
            )

        variable_type = variable["type"]
        value = condition.value
        if condition.operator in {"in", "not_in"}:
            if not isinstance(value, list) or not value:
                raise HTTPException(status_code=422, detail=f"{condition.operator} requires a non-empty list.")
            for item in value:
                self._validate_scalar_type(variable_type, item, condition.field)
            return

        self._validate_scalar_type(variable_type, value, condition.field)

    def _validate_scalar_type(self, variable_type: str, value: object, field: str) -> None:
        if variable_type == "number":
            if isinstance(value, bool) or not isinstance(value, (int, float)):
                raise HTTPException(status_code=422, detail=f"{field} requires a numeric value.")
        elif variable_type == "boolean":
            if not isinstance(value, bool):
                raise HTTPException(status_code=422, detail=f"{field} requires a boolean value.")
        elif variable_type == "string":
            if not isinstance(value, str) or not value.strip():
                raise HTTPException(status_code=422, detail=f"{field} requires a non-empty string value.")
