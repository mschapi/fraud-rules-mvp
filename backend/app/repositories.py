import json
from uuid import uuid4

from sqlalchemy.orm import Session

from app.models import Rule
from app.schemas import ConditionsGroup, RuleCreate, RuleOut, RuleUpdate, SimulationMetrics


def rule_to_out(rule: Rule) -> RuleOut:
    last_simulation = None
    if rule.last_simulation_json:
        last_simulation = SimulationMetrics(**json.loads(rule.last_simulation_json))
    return RuleOut(
        id=rule.id,
        name=rule.name,
        description=rule.description,
        action=rule.action,
        status=rule.status,
        conditions=ConditionsGroup(**json.loads(rule.conditions_json)),
        created_at=rule.created_at,
        updated_at=rule.updated_at,
        last_simulation=last_simulation,
    )


def list_rules(db: Session) -> list[RuleOut]:
    return [rule_to_out(rule) for rule in db.query(Rule).order_by(Rule.updated_at.desc()).all()]


def get_rule(db: Session, rule_id: str) -> Rule | None:
    return db.query(Rule).filter(Rule.id == rule_id).first()


def create_rule(db: Session, payload: RuleCreate) -> Rule:
    rule = Rule(
        id=payload.name.strip().lower().replace(" ", "_") or str(uuid4()),
        name=payload.name,
        description=payload.description,
        action=payload.action,
        status="active",
        conditions_json=json.dumps(payload.conditions.model_dump()),
    )
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return rule


def update_rule(db: Session, rule: Rule, payload: RuleUpdate) -> Rule:
    rule.name = payload.name
    rule.description = payload.description
    rule.action = payload.action
    rule.status = payload.status
    rule.conditions_json = json.dumps(payload.conditions.model_dump())
    db.commit()
    db.refresh(rule)
    return rule


def set_last_simulation(db: Session, rule: Rule, metrics: SimulationMetrics) -> Rule:
    rule.last_simulation_json = json.dumps(metrics.model_dump())
    db.commit()
    db.refresh(rule)
    return rule

