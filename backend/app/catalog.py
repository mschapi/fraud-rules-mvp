VARIABLE_CATALOG = [
    {
        "name": "user_age_days",
        "label": "User age in days",
        "type": "number",
        "description": "Number of days since user registration",
        "allowed_operators": ["<", "<=", ">", ">=", "==", "!="],
    },
    {
        "name": "tx_count_10m",
        "label": "Transactions in last 10 minutes",
        "type": "number",
        "description": "Number of transactions from this user in the last 10 minutes",
        "allowed_operators": ["<", "<=", ">", ">=", "==", "!="],
    },
    {
        "name": "distinct_cards_15m",
        "label": "Distinct cards in last 15 minutes",
        "type": "number",
        "description": "Number of distinct cards used by the user in the last 15 minutes",
        "allowed_operators": ["<", "<=", ">", ">=", "==", "!="],
    },
    {
        "name": "failed_payment_attempts_15m",
        "label": "Failed payment attempts in last 15 minutes",
        "type": "number",
        "description": "Number of failed payment attempts in the last 15 minutes",
        "allowed_operators": ["<", "<=", ">", ">=", "==", "!="],
    },
    {
        "name": "is_new_card",
        "label": "Is new card",
        "type": "boolean",
        "description": "Whether the card was recently added",
        "allowed_operators": ["==", "!="],
    },
    {
        "name": "amount",
        "label": "Transaction amount",
        "type": "number",
        "description": "Transaction amount",
        "allowed_operators": ["<", "<=", ">", ">=", "==", "!="],
    },
    {
        "name": "country",
        "label": "Country",
        "type": "string",
        "description": "Transaction country",
        "allowed_operators": ["==", "!=", "in", "not_in"],
    },
    {
        "name": "model_score",
        "label": "Model score",
        "type": "number",
        "description": "Fraud model score between 0 and 1",
        "allowed_operators": ["<", "<=", ">", ">=", "==", "!="],
    },
]

CATALOG_BY_NAME = {variable["name"]: variable for variable in VARIABLE_CATALOG}

