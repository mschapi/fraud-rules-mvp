from datetime import date, datetime, timedelta
import random
from typing import Any

from app.schemas import RuleBase, SimulationMetrics


class SimulationService:
    def __init__(self) -> None:
        self.transactions = self._generate_transactions()

    def simulate(self, rule: RuleBase, start_date: date, end_date: date) -> tuple[SimulationMetrics, list[str]]:
        if end_date < start_date:
            raise ValueError("end_date must be greater than or equal to start_date")

        scoped = [
            tx
            for tx in self.transactions
            if start_date <= tx["created_at"].date() <= end_date
        ]
        matched = [tx for tx in scoped if self._matches_rule(rule, tx)]

        total_transactions = len(scoped)
        matched_transactions = len(matched)
        fraud_txs = [tx for tx in scoped if tx["is_fraud"]]
        captured_fraud_txs = [tx for tx in matched if tx["is_fraud"]]

        total_amount = sum(tx["amount"] for tx in scoped)
        matched_amount = sum(tx["amount"] for tx in matched)
        total_fraud_amount = sum(tx["fraud_amount"] for tx in scoped)
        captured_fraud_amount = sum(tx["fraud_amount"] for tx in captured_fraud_txs)

        matched_pct = self._pct(matched_transactions, total_transactions)
        captured_fraud_pct = self._pct(len(captured_fraud_txs), len(fraud_txs))
        captured_fraud_amount_pct = self._pct(captured_fraud_amount, total_fraud_amount)
        fraud_rate_inside = self._pct(len(captured_fraud_txs), matched_transactions)
        fraud_rate_global = self._pct(len(fraud_txs), total_transactions)
        lift = round((fraud_rate_inside / fraud_rate_global), 2) if fraud_rate_global else 0.0

        metrics = SimulationMetrics(
            total_transactions=total_transactions,
            matched_transactions=matched_transactions,
            matched_transactions_pct=matched_pct,
            total_fraud_transactions=len(fraud_txs),
            captured_fraud_transactions=len(captured_fraud_txs),
            captured_fraud_transactions_pct=captured_fraud_pct,
            total_amount=round(total_amount, 2),
            matched_amount=round(matched_amount, 2),
            total_fraud_amount=round(total_fraud_amount, 2),
            captured_fraud_amount=round(captured_fraud_amount, 2),
            captured_fraud_amount_pct=captured_fraud_amount_pct,
            fraud_rate_inside_rule=fraud_rate_inside,
            fraud_rate_global=fraud_rate_global,
            lift=lift,
        )
        return metrics, self._warnings(metrics)

    def _matches_rule(self, rule: RuleBase, tx: dict[str, Any]) -> bool:
        return all(self._matches_condition(tx[condition.field], condition.operator, condition.value) for condition in rule.conditions.all)

    def _matches_condition(self, left: Any, operator: str, right: Any) -> bool:
        if operator == "==":
            return left == right
        if operator == "!=":
            return left != right
        if operator == ">":
            return left > right
        if operator == ">=":
            return left >= right
        if operator == "<":
            return left < right
        if operator == "<=":
            return left <= right
        if operator == "in":
            return left in right
        if operator == "not_in":
            return left not in right
        return False

    def _warnings(self, metrics: SimulationMetrics) -> list[str]:
        warnings: list[str] = []
        if metrics.matched_transactions_pct > 10:
            warnings.append("Rule affects more than 10% of traffic.")
        if metrics.lift < 2:
            warnings.append("Lift is below 2.")
        if metrics.matched_transactions < 30:
            warnings.append("Matched sample is too small.")
        if metrics.captured_fraud_transactions_pct < 1:
            warnings.append("Fraud capture is below 1%.")
        return warnings

    def _pct(self, numerator: float, denominator: float) -> float:
        return round((numerator / denominator) * 100, 2) if denominator else 0.0

    def _generate_transactions(self) -> list[dict[str, Any]]:
        random.seed(42)
        countries = ["AR", "BR", "CL", "CO", "MX", "US", "UY"]
        start = datetime.utcnow() - timedelta(days=90)
        transactions: list[dict[str, Any]] = []

        for idx in range(5000):
            user_age_days = random.randint(0, 730)
            is_very_new_user = user_age_days <= 7
            tx_count_10m = min(
                random.randint(0, 2)
                + (1 if random.random() < (0.38 if is_very_new_user else 0.12) else 0)
                + (2 if random.random() < (0.18 if is_very_new_user else 0.03) else 0),
                12,
            )
            distinct_cards_15m = min(
                1
                + (1 if random.random() < (0.22 if tx_count_10m >= 3 else 0.09) else 0)
                + (2 if random.random() < 0.02 else 0),
                7,
            )
            failed_attempts = min(random.randint(0, 1) + (2 if random.random() < (0.12 if tx_count_10m >= 3 else 0.04) else 0), 8)
            is_new_card = random.random() < (0.55 if is_very_new_user else 0.18)
            amount = round(random.lognormvariate(4.2, 0.75), 2)
            country = random.choice(countries)

            risk = 0.015
            risk += 0.12 if user_age_days <= 7 else 0
            risk += 0.08 if tx_count_10m >= 3 else 0
            risk += 0.09 if distinct_cards_15m >= 2 else 0
            risk += 0.1 if failed_attempts >= 3 else 0
            risk += 0.07 if is_new_card else 0
            risk += 0.03 if amount > 250 else 0
            risk = min(risk, 0.8)
            is_fraud = random.random() < risk
            model_score = min(max(random.gauss(risk * 2.2, 0.12), 0), 1)

            transactions.append(
                {
                    "transaction_id": f"tx_{idx + 1:05d}",
                    "created_at": start + timedelta(minutes=random.randint(0, 90 * 24 * 60)),
                    "amount": amount,
                    "country": country,
                    "is_fraud": is_fraud,
                    "fraud_amount": amount if is_fraud else 0.0,
                    "user_age_days": user_age_days,
                    "tx_count_10m": tx_count_10m,
                    "distinct_cards_15m": distinct_cards_15m,
                    "failed_payment_attempts_15m": failed_attempts,
                    "is_new_card": is_new_card,
                    "model_score": round(model_score, 3),
                }
            )

        return transactions
