from app.schemas import CreatePrResponse, RuleBase, SimulationMetrics
from app.services.yaml_generator import RuleYamlService


class PullRequestService:
    def __init__(self, yaml_service: RuleYamlService) -> None:
        self.yaml_service = yaml_service

    def create_mock_pr(
        self,
        rule_id: str,
        rule: RuleBase,
        last_simulation: SimulationMetrics | None,
    ) -> CreatePrResponse:
        yaml_content = self.yaml_service.to_yaml(rule_id, rule, last_simulation)
        branch = f"fraud-rule/{rule_id}"
        return CreatePrResponse(
            pr_url=f"https://github.example.com/fraud/rules/pull/mock-{rule_id}",
            yaml_content=yaml_content,
            title=f"Deploy fraud rule: {rule.name}",
            branch=branch,
        )

