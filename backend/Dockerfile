FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt requirements-ai.txt ./
ARG INSTALL_AI=true
RUN pip install --no-cache-dir -r requirements.txt && \
    if [ "$INSTALL_AI" = "true" ]; then pip install --no-cache-dir torch==2.4.0 transformers==4.44.2 open-clip-torch==2.26.1; fi

COPY . .

EXPOSE 8000
