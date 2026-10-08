FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt requirements-ai.txt ./
ARG INSTALL_AI=false
RUN pip install --no-cache-dir -r requirements.txt && \
    if [ "$INSTALL_AI" = "true" ]; then pip install --no-cache-dir -r requirements-ai.txt; fi

COPY . .

# Create a non-root user and hand over ownership
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser \
    && mkdir -p logs media staticfiles \
    && chmod +x docker-entrypoint.sh \
    && chown -R appuser:appgroup /app

USER appuser

EXPOSE 8000

ENTRYPOINT ["./docker-entrypoint.sh"]

# Production ASGI server — dev docker-compose.yml overrides CMD with runserver
CMD ["gunicorn", "config.asgi:application", \
     "--worker-class", "uvicorn.workers.UvicornWorker", \
     "--workers", "4", \
     "--bind", "0.0.0.0:8000", \
     "--access-logfile", "-", \
     "--error-logfile", "-"]
