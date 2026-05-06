from app.schemas import AiSuggestionResponse, Condition, ConditionsGroup, RuleCreate


class AiRuleSuggestionService:
    def suggest(self, message: str) -> AiSuggestionResponse:
        lowered = message.lower()
        conditions: list[Condition] = []

        if "new users" in lowered or "usuarios nuevos" in lowered:
            conditions.append(Condition(field="user_age_days", operator="<=", value=7))
        if "many purchases" in lowered or "muchas compras" in lowered:
            conditions.append(Condition(field="tx_count_10m", operator=">=", value=3))
        if "new card" in lowered or "tarjeta nueva" in lowered:
            conditions.append(Condition(field="is_new_card", operator="==", value=True))
        if "cards" in lowered or "tarjetas distintas" in lowered:
            conditions.append(Condition(field="distinct_cards_15m", operator=">=", value=2))
        if "failed attempts" in lowered or "intentos fallidos" in lowered:
            conditions.append(Condition(field="failed_payment_attempts_15m", operator=">=", value=3))

        warnings: list[str] = []
        if not conditions:
            conditions.append(Condition(field="model_score", operator=">=", value=0.75))
            warnings.append("No exact keyword match found, so a conservative model_score rule was suggested.")

        rule = RuleCreate(
            name="ai_suggested_rule",
            description="Draft rule suggested from natural language",
            action="review",
            conditions=ConditionsGroup(all=conditions),
        )
        return AiSuggestionResponse(
            proposed_rule=rule,
            explanation="This mock assistant maps recognized phrases to controlled catalog fields and operators.",
            warnings=warnings,
        )

