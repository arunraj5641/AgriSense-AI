# AgriSense AI

Resource-Aware Intelligent Advisory System for Food Processing Units.

## Overview
AgriSense AI is an MVP for providing resource-aware, intelligent agricultural advisory. It provides deterministic, personalized recommendations to farmers based on their available resources (budget, equipment, water, farm size, crop stage) against potential actions. 

This phase does not use LLMs, RAG, or vector databases.

## Tech Stack
- **Frontend**: Next.js (App Router), React, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, React Hook Form, Zod
- **Backend**: FastAPI, Python 3.12, SQLAlchemy 2.0, Alembic, Pydantic, JWT Authentication
- **Database**: PostgreSQL 16
- **Infrastructure**: Docker, Docker Compose

## Quickstart

The project is configured for a zero-configuration startup. Database migrations are already included in the repository, so no manual generation is required. During initialization, the backend entrypoint automatically:
1. Waits for PostgreSQL to become fully ready.
2. Applies all existing database migrations (`alembic upgrade head`).
3. Starts the FastAPI application.

To start the entire Phase 1 MVP, simply run:

```bash
cp .env.example .env
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- Swagger: http://localhost:8000/docs

## Folder Structure
- `backend/`: FastAPI Python application
- `frontend/`: Next.js React application
