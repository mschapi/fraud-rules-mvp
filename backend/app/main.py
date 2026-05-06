import os
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.catalog import VARIABLE_CATALOG
from app.database import Base, engine, get_db
from app.repositories import create_rule, get_rule, list_rules, rule_to_out, set_last_simulation, update_rule
from app.schemas import (
    AiSuggestionRequest,
    AiSuggestionResponse,
    CreatePrResponse,
    RuleCreate,
    RuleOut,
    RuleUpdate,
    SimulationRequest,
    SimulationResponse,
    Variable,
)
from app.services.ai import AiRuleSuggestionService
from app.services.pr import PullRequestService
from app.services.simulation import SimulationService
from app.services.validation import RuleValidationService
from app.services.yaml_generator import RuleYamlService

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Fraud Rules Management MVP")

allowed_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ALLOW_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

validator = RuleValidationService()
simulation_service = SimulationService()
ai_service = AiRuleSuggestionService()
yaml_service = RuleYamlService()
pr_service = PullRequestService(yaml_service)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/variables", response_model=list[Variable])
def variables() -> list[dict]:
    return VARIABLE_CATALOG


@app.get("/rules", response_model=list[RuleOut])
def rules(db: Session = Depends(get_db)) -> list[RuleOut]:
    return list_rules(db)


@app.post("/rules", response_model=RuleOut)
def create(payload: RuleCreate, db: Session = Depends(get_db)) -> RuleOut:
    validator.validate_rule(payload)
    try:
        return rule_to_out(create_rule(db, payload))
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="A rule with this name already exists.") from exc


@app.get("/rules/{rule_id}", response_model=RuleOut)
def detail(rule_id: str, db: Session = Depends(get_db)) -> RuleOut:
    rule = get_rule(db, rule_id)
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found.")
    return rule_to_out(rule)


@app.put("/rules/{rule_id}", response_model=RuleOut)
def update(rule_id: str, payload: RuleUpdate, db: Session = Depends(get_db)) -> RuleOut:
    validator.validate_rule(payload)
    rule = get_rule(db, rule_id)
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found.")
    return rule_to_out(update_rule(db, rule, payload))


@app.post("/rules/{rule_id}/simulate", response_model=SimulationResponse)
def simulate(rule_id: str, payload: SimulationRequest, db: Session = Depends(get_db)) -> SimulationResponse:
    rule = get_rule(db, rule_id)
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found.")

    rule_out = rule_to_out(rule)
    try:
        metrics, warnings = simulation_service.simulate(rule_out, payload.start_date, payload.end_date)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    set_last_simulation(db, rule, metrics)
    return SimulationResponse(metrics=metrics, warnings=warnings)


@app.post("/ai/rule-suggestion", response_model=AiSuggestionResponse)
def ai_rule_suggestion(payload: AiSuggestionRequest) -> AiSuggestionResponse:
    suggestion = ai_service.suggest(payload.message)
    validator.validate_rule(suggestion.proposed_rule)
    return suggestion


@app.post("/rules/{rule_id}/create-pr", response_model=CreatePrResponse)
def create_pr(rule_id: str, db: Session = Depends(get_db)) -> CreatePrResponse:
    rule = get_rule(db, rule_id)
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found.")
    rule_out = rule_to_out(rule)
    return pr_service.create_mock_pr(rule_id, rule_out, rule_out.last_simulation)


FRONTEND_DIST = Path(__file__).resolve().parents[2] / "frontend" / "dist"
if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")
    app.mount("/brand", StaticFiles(directory=FRONTEND_DIST / "brand"), name="brand")

    @app.get("/{path:path}", include_in_schema=False)
    def serve_frontend(path: str) -> FileResponse:
        requested_path = FRONTEND_DIST / path
        if path and requested_path.is_file():
            return FileResponse(requested_path)
        return FileResponse(FRONTEND_DIST / "index.html")
