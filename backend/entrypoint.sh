#!/bin/bash
set -e

echo "Running Database Migrations..."
alembic upgrade head

echo "Starting Application..."
exec "$@"
