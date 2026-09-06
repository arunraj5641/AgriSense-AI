.PHONY: dev build down logs test-backend test-frontend

# Docker Compose Commands
dev:
	docker-compose up -d --build

down:
	docker-compose down

logs:
	docker-compose logs -f

logs-backend:
	docker-compose logs -f backend

logs-frontend:
	docker-compose logs -f frontend

# Backend Commands (Local or in container)
test-backend:
	docker-compose exec backend pytest

# Frontend Commands
test-frontend:
	docker-compose exec frontend npm run test
