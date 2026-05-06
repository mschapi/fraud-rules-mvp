FROM node:20-slim AS frontend

WORKDIR /work
COPY source.zip.b64.part* /tmp/
RUN apt-get update \
    && apt-get install -y --no-install-recommends unzip \
    && rm -rf /var/lib/apt/lists/*
RUN cat /tmp/source.zip.b64.part* | base64 -d > /tmp/source.zip \
    && unzip /tmp/source.zip -d /work

WORKDIR /work/frontend
RUN npm ci
RUN npm run build

FROM python:3.12-slim

WORKDIR /app
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app/backend
ENV DATABASE_URL=sqlite:////tmp/fraud_rules.db
ENV CORS_ALLOW_ORIGINS=

COPY --from=frontend /work/backend ./backend
COPY --from=frontend /work/frontend/dist ./frontend/dist
RUN pip install --no-cache-dir -r backend/requirements.txt

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --app-dir backend"]
