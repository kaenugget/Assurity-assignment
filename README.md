# AssureOps

**Operational assurance at a glance.**

AssureOps is a lightweight reliability dashboard for **fictional auth-critical internal web services that power government-style applications**. It periodically checks configured endpoints, records availability, latency, and version data, detects version drift and repeated failures, persists the results in Convex, and presents the latest state through a documented FastAPI API and a polished React dashboard.

> **Important demo framing**
>
> The monitored stack in this repo is fictional: `GovPass Authorize`, `GovPass Token`, `Citizen Profile API`, and related services exist only to make the scenario cohesive.
>
> AssureOps is **not affiliated with Singpass or GovTech**, does **not** use official branding, and does **not** implement real authentication flows.

## What it does

- Loads service definitions from YAML or JSON.
- Periodically checks each configured endpoint with `httpx`.
- Derives `HEALTHY`, `DEGRADED`, or `DOWN` from response code, latency, and version drift.
- Supports version extraction from JSON, headers, regex, or `none`.
- Opens and resolves incidents for repeated failures, latency degradation, and version drift.
- Emits console alerts and optional webhook alerts.
- Persists services, checks, incidents, layouts, and AI artifacts in Convex.
- Exposes Swagger at `/docs` and ReDoc at `/redoc`.
- Renders a light-first internal dashboard with draggable and resizable widgets.

## Fictional demo stack

The seeded config in [`api/data/services.yaml`](api/data/services.yaml) monitors these fictional services:

- GovPass Authorize
- GovPass Token
- GovPass Callback
- GovPass JWKS
- Citizen Profile API
- OTP Notifications
- Legacy Benefits API

Built-in demo endpoints simulate:

- healthy
- slow
- drift
- flaky
- down

## Architecture

### Frontend

- React
- Vite
- TypeScript
- Tailwind CSS
- shadcn/ui-style primitives
- `react-grid-layout`
- Recharts
- Convex React client

### Backend

- FastAPI
- APScheduler
- `httpx`
- Pydantic
- OpenAPI docs at `/docs` and `/redoc`

### Persistence

- Convex as the primary app data store

## Why this stack

### React + Vite

React is a strong fit for a dashboard with live state, card resizing, drilldowns, and responsive visualizations. Vite keeps the setup fast and reviewer-friendly.

### FastAPI

FastAPI makes the operational API easy to document and type. The automatic OpenAPI docs are especially useful for the admin and AI helper endpoints.

### Convex

Convex gives the frontend live reads without adding a separate polling layer. FastAPI owns the monitoring logic, while Convex stays focused on persistent application state and subscriptions.

## Status model

- `DOWN`: timeout, DNS failure, connection failure, or non-2xx response
- `HEALTHY`: 2xx response, latency within threshold, and version matches expected or version is unavailable
- `DEGRADED`: 2xx response, but latency exceeds threshold and/or version drift is detected

Missing version data does **not** mark a service as `DOWN`.

## Dashboard

The dashboard ships with these widgets:

- Fleet Overview
- Environment Health
- Platform Footprint
- Version Drift
- Latency Trends
- Recent Incidents
- Services Table
- Auth Journey Health

Adaptive behavior is deterministic:

- small cards show KPI, badge, or compact summary
- medium cards show compact charts or shorter lists
- large cards show full charts, richer lists, and drilldown context

The `Auth Journey Health` widget visualizes the fictional chain:

`Authorize -> Token -> Callback -> Profile -> App API`

## Service config

Required fields:

- `name`
- `url`
- `expected_version`

Optional fields:

- `environment`
- `platform`: `ecs | ec2 | manual`
- `component_type`: `authorize | token | callback | jwks | profile | otp | app_api | legacy`
- `timeout_ms`
- `latency_threshold_ms`
- `version_source_type`: `json | header | regex | none`
- `version_source_key`
- `aws_region`
- `aws_cluster`
- `aws_service_name`
- `deployment_label`

Example:

```yaml
services:
  - name: GovPass Authorize
    url: ${SELF_BASE_URL:-http://127.0.0.1:8000}/demo/healthy?version=2026.03.14
    expected_version: "2026.03.14"
    environment: production
    platform: ecs
    component_type: authorize
    timeout_ms: 3000
    latency_threshold_ms: 800
    version_source_type: json
    version_source_key: meta.version

  - name: GovPass Token
    url: ${SELF_BASE_URL:-http://127.0.0.1:8000}/demo/slow?version=2026.03.14&delay_ms=1450
    expected_version: "2026.03.14"
    environment: production
    platform: ecs
    component_type: token
    version_source_type: header
    version_source_key: X-Service-Version
```

## API

FastAPI serves these routes:

- `GET /api/services`
- `GET /api/services/{service_key}`
- `GET /api/services/{service_key}/history?limit=20`
- `GET /api/summary`
- `GET /api/incidents`
- `POST /api/reload-config`
- `POST /api/check-now`
- `POST /api/ai/incident-summary`
- `POST /api/ai/layout-suggestion`

Docs:

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Quickstart

### Prerequisites

- Node.js 20+
- Python 3.11+
- Docker Desktop if you want the compose path

### Environment

```bash
cp .env.example .env
```

Key deployment-related variables:

- `CONVEX_URL`: Convex deployment URL used by FastAPI.
- `VITE_CONVEX_URL`: Convex deployment URL used by the React app.
- `VITE_API_BASE_URL`: public API URL used by the React app.
- `CORS_ALLOWED_ORIGINS`: comma-separated frontend origins allowed to call FastAPI.
- `SELF_BASE_URL`: optional override for the demo endpoints in `api/data/services.yaml`. If omitted, the API derives `http://127.0.0.1:$PORT` in hosted environments and `http://127.0.0.1:8000` locally.

### Docker

```bash
docker compose up --build
```

If you previously started the stack before the Docker fixes in this repo, clear old containers and volumes once:

```bash
docker compose down -v
docker compose up --build
```

Expected local URLs:

- Frontend: `http://localhost:3000`
- API: `http://localhost:8000`
- Swagger: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
- Convex local deployment: `http://localhost:3210`

### Local development

```bash
npm install
python3 -m venv .venv
.venv/bin/pip install -r api/requirements.txt
cd web && npm install && cd ..
```

Run Convex locally:

```bash
CONVEX_AGENT_MODE=anonymous npx convex dev --local
```

Run the API:

```bash
.venv/bin/uvicorn app.main:app --reload --app-dir api
```

Run the frontend:

```bash
cd web
npm run dev
```

## Render Deployment

Render can host both pieces of this project:

- the FastAPI app as a long-running web service
- the React app as a static site

You still need a hosted Convex deployment for production. The local `convex dev --local` flow in this repo is only for development.

### 1. Deploy Convex

Create a Convex deployment, then deploy the functions from the repo root:

```bash
npx convex deploy
```

Use the hosted Convex URL for both:

- backend `CONVEX_URL`
- frontend `VITE_CONVEX_URL`

### 2. Deploy the backend on Render

This repo includes a [`render.yaml`](render.yaml) blueprint for Render.

If you configure the backend manually instead, use:

- Root Directory: `api`
- Build Command: `pip install -r requirements.txt`
- Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Health Check Path: `/healthz`

Backend env vars:

- `CONVEX_URL=<your hosted Convex URL>`
- `SERVICE_CONFIG_PATH=data/services.yaml`
- `CHECK_INTERVAL_SECONDS=30`
- `CORS_ALLOWED_ORIGINS=https://<your-frontend-domain>`
- `OPENAI_API_KEY=` optional
- `OPENAI_MODEL=gpt-5`

`SELF_BASE_URL` can stay unset on Render unless you want to override the built-in demo endpoint base URL.

### 3. Deploy the frontend on Render

If you configure the frontend manually instead of using `render.yaml`, use:

- Root Directory: `web`
- Build Command: `npm ci && npm run build`
- Publish Directory: `dist`

Frontend env vars:

- `VITE_API_BASE_URL=https://<your-api-domain>`
- `VITE_CONVEX_URL=https://<your hosted Convex URL>`

The Render blueprint also includes an SPA rewrite so `react-router` routes keep working when the page is refreshed.

## Testing

Backend:

```bash
.venv/bin/pytest api/app/tests
```

Frontend:

```bash
cd web
npm test
npm run build
```

## Trade-offs and non-goals

- Convex keeps the live dashboard simple, but it adds one more moving part than a local database.
- The checker runs in-process with FastAPI for simplicity; production scale would likely split it into a dedicated worker.
- The project deliberately avoids CloudWatch ingestion, deep AWS infra metrics, RBAC, service CRUD from the UI, and arbitrary AI-generated frontend code.
- Public Convex write functions are acceptable for this take-home’s internal-tool framing, but they would need hardening before a real deployment.

## Screenshots / GIF

Placeholder for:

- dashboard overview
- resized-card layout
- service detail drawer
- Swagger UI

## Infrastructure note

For a production-leaning deployment, I would run FastAPI in a container behind a load balancer, keep the scheduler either in the API process for small scale or move it to a separate worker for higher check volume, and host the frontend as a static asset bundle or behind the same ingress. Convex would continue to hold service snapshots, check history, incidents, layouts, and AI artifacts. Operational monitoring would focus on scheduler execution latency, failed check volume, incident churn, webhook delivery failures, and API availability. Secrets such as webhook URLs and OpenAI keys should be injected through environment variables, not committed config. This take-home intentionally stays lightweight and optimizes for local startup, reviewer clarity, and end-to-end completeness over production-hardening depth.

## AI usage note

- `POST /api/ai/incident-summary` uses OpenAI Responses when `OPENAI_API_KEY` is present and falls back to deterministic summaries when it is not.
- `POST /api/ai/layout-suggestion` only returns structured widget placement JSON. It does **not** generate arbitrary frontend code.
- The latest AI summary or layout artifact is persisted in Convex for live dashboard reads.
