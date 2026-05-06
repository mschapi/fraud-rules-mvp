import os
from datetime import date, timedelta
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.catalog import VARIABLE_CATALOG
from app.database import Base, engine, get_db
from app.repositories import create_rule, create_simulation_run, get_rule, list_rules, list_simulation_runs, rule_to_out, set_last_simulation, update_rule
from app.schemas import (
    AiSuggestionRequest,
    AiSuggestionResponse,
    CreatePrResponse,
    RuleCreate,
    RuleOut,
    RuleUpdate,
    SimulationRequest,
    SimulationResponse,
    SimulationRunOut,
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
    if payload.query_text:
        start_date = date.today() - timedelta(days=30)
        end_date = date.today()
        mode = "query"
        warnings_prefix = ["Query mode accepted a scoped input query for this simulation."]
    else:
        if not payload.start_date or not payload.end_date:
            raise HTTPException(status_code=422, detail="Start and end dates are required unless query_text is provided.")
        start_date = payload.start_date
        end_date = payload.end_date
        mode = "date_range"
        warnings_prefix = []
    try:
        metrics, warnings = simulation_service.simulate(rule_out, start_date, end_date)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    warnings = warnings_prefix + warnings
    set_last_simulation(db, rule, metrics)
    create_simulation_run(
        db,
        rule_id=rule_id,
        mode=mode,
        metrics=metrics,
        warnings=warnings,
        start_date=str(start_date) if mode == "date_range" else None,
        end_date=str(end_date) if mode == "date_range" else None,
        query_text=payload.query_text,
    )
    return SimulationResponse(metrics=metrics, warnings=warnings)


@app.get("/rules/{rule_id}/simulations", response_model=list[SimulationRunOut])
def simulation_history(rule_id: str, db: Session = Depends(get_db)) -> list[SimulationRunOut]:
    if not get_rule(db, rule_id):
        raise HTTPException(status_code=404, detail="Rule not found.")
    return list_simulation_runs(db, rule_id)


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
