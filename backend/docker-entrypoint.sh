#!/bin/bash
set -e

echo "==> Running database migrations..."
python manage.py migrate --noinput

echo "==> Collecting static files..."
python manage.py collectstatic --noinput --clear

echo "==> Seeding default accounts..."
python manage.py create_defaults

echo "==> Starting server..."
exec "$@"
