import json
import os
import urllib.error
import urllib.request

from app.schemas import AiSuggestionResponse, AssistantChatRequest, AssistantChatResponse, Condition, ConditionsGroup, RuleCreate


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


class AnalyticAssistantService:
    def chat(self, payload: AssistantChatRequest) -> AssistantChatResponse:
        api_key = os.getenv("GEMINI_API_KEY")
        if api_key:
            response = self._gemini_chat(api_key, payload)
            if response:
                return response
        return self._fallback_chat(payload)

    def _gemini_chat(self, api_key: str, payload: AssistantChatRequest) -> AssistantChatResponse | None:
        prompt = (
            "You are a fraud prevention analytics assistant. "
            "Be concise and practical. Suggest fraud-rule or anomaly-alert ideas only when useful. "
            "Never invent that you queried a database; use only the provided dataset summary.\n\n"
            f"Context: {payload.context}\n"
            f"Dataset summary: {payload.dataset_summary or 'not provided'}\n"
            f"User question: {payload.message}\n\n"
            "Return JSON with keys: answer, insights (array of strings), python_code (string or null)."
        )
        body = json.dumps({"contents": [{"parts": [{"text": prompt}]}]}).encode("utf-8")
        request = urllib.request.Request(
            f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}",
            data=body,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=20) as response:
                data = json.loads(response.read().decode("utf-8"))
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError):
            return None

        text = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
        try:
            parsed = json.loads(text.strip().removeprefix("```json").removesuffix("```").strip())
        except json.JSONDecodeError:
            parsed = {"answer": text, "insights": [], "python_code": None}
        return AssistantChatResponse(
            answer=parsed.get("answer", text),
            insights=parsed.get("insights", []),
            python_code=parsed.get("python_code"),
            model="gemini-1.5-flash",
        )

    def _fallback_chat(self, payload: AssistantChatRequest) -> AssistantChatResponse:
        if payload.context == "analytics":
            answer = "I can profile uploaded CSV summaries or a connected table and suggest where to investigate fraud concentration."
            insights = [
                payload.dataset_summary or "No dataset summary provided yet.",
                "Look for amount-weighted fraud concentration before changing rules to reject.",
                "Use anomaly alerts for drift in approval rate, score distribution, or transaction volume.",
            ]
        elif payload.context == "alerts":
            answer = "A good alert should watch an anomaly signal, threshold, time window, severity, and routing channel."
            insights = ["Start with high-severity alerts for distribution shifts and approval-rate drops.", "Tune thresholds after reviewing alert frequency."]
        else:
            answer = "A good fraud rule should be explicit, simulatable, and measured by bloqueo and eficiencia before deployment."
            insights = ["New-card plus high model score is a common first candidate.", "Review before reject until amount-weighted efficiency is stable."]
        return AssistantChatResponse(answer=answer, insights=insights, model="deterministic-fallback")
