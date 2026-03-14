FROM python:3.12-slim AS api

WORKDIR /workspace

COPY api/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

COPY api /workspace/api

WORKDIR /workspace/api
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]


FROM node:20-slim AS web

WORKDIR /workspace

COPY web/package.json web/package-lock.json* /workspace/web/
RUN cd /workspace/web && npm install

COPY web /workspace/web

WORKDIR /workspace/web
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"]


FROM node:20-slim AS convex

WORKDIR /workspace

COPY package.json package-lock.json* convex.json /workspace/
COPY convex /workspace/convex
RUN npm install

CMD ["npm", "run", "convex:dev"]
