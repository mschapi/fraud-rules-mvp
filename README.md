# Fraud Rules Management MVP

Internal MVP for creating, validating, simulating, and preparing fraud rules for deployment. It intentionally keeps the rule source of truth as structured JSON/YAML, not arbitrary Python or SQL.

## Project Structure

- `backend`: FastAPI, Pydantic, SQLAlchemy, SQLite, PyYAML
- `frontend`: React, TypeScript, Vite, Tailwind CSS, React Hook Form, Zod, TanStack Query
- `Dockerfile`: production build that compiles the frontend and serves it from FastAPI
- `render.yaml`: Render blueprint for a single Docker web service

## Setup

Backend:

```bash
cd backend
python -m venv .venv
.venv/Scripts/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

On this Codex/Windows workspace, Python is available through the bundled runtime. You can also run:

```bat
backend\run-dev.cmd
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

The frontend expects the backend at `http://localhost:8000`.

Local URLs:

- Frontend: `http://127.0.0.1:5173`
- Backend health check: `http://127.0.0.1:8000/health`

## Production Deploy

The MVP is configured for a single-service deploy. The Docker image builds the Vite frontend, copies `frontend/dist`
into the runtime image, and starts FastAPI with:

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT --app-dir backend
```

On Render:

1. Connect this GitHub repository.
2. Choose the included `render.yaml` blueprint, or create a Docker web service manually.
3. Keep the health check path as `/health`.

The frontend is served from the same origin as the API. React uses hash routing in production so app routes do not
conflict with API endpoints like `GET /rules`.

## Shareable Interface Demo

The repository also includes a GitHub Pages workflow that publishes a frontend-only demo with deterministic mock data.
It is meant for quick team review of the interface without standing up the FastAPI backend.

Expected public URL after the workflow succeeds:

```text
https://mschapi.github.io/fraud-rules-mvp/
```

## Access Needed

No GitHub, GitLab, database, warehouse, or OpenAI API access is required for this MVP. Everything runs with mock data and mock integrations.

Later, to deploy or integrate it for real, useful access would be:

- A Git repository where the monorepo should live.
- A backend deployment target.
- A frontend hosting target.
- A production database or warehouse connection.
- GitHub/GitLab API credentials for real PR creation.
- OpenAI API credentials for the real assistant.

## API Endpoints

- `GET /variables`: returns controlled variable catalog
- `GET /rules`: returns saved rules
- `POST /rules`: creates a structured rule
- `GET /rules/{rule_id}`: returns one rule
- `PUT /rules/{rule_id}`: updates one rule
- `POST /rules/{rule_id}/simulate`: runs simulation over mock historical transactions
- `POST /ai/rule-suggestion`: deterministic mock natural-language rule suggestion
- `POST /rules/{rule_id}/create-pr`: returns a mock PR payload and generated YAML

## MVP Notes

- The mock dataset is generated in memory with 5,000 deterministic transactions.
- Rules are stored in SQLite as structured condition JSON.
- Validation rejects unknown variables, unsupported operators, invalid value types, invalid actions, and empty rules. Supported actions are `reject`, `review`, and `approve`.
- The AI assistant is deterministic mock logic. It has a clear backend service boundary where an OpenAI API call can be added later.
- The PR generator does not call GitHub. It returns a fake PR URL and YAML preview.

## Productionizing Next Steps

- Replace SQLite with PostgreSQL.
- Replace mock dataset with warehouse query or feature store reads.
- Replace mock AI assistant with an OpenAI API call.
- Replace mock PR generator with GitHub/GitLab API integration.
- Add authentication.
- Add role-based permissions.
- Add audit logs.
- Add shadow mode.
- Add monitoring after deploy.
