#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${PROJECT_ID:-}" ]]; then
  echo "PROJECT_ID is required"
  exit 1
fi

if [[ -z "${API_BASE_URL:-}" ]]; then
  echo "API_BASE_URL is required"
  exit 1
fi

REGION="${REGION:-us-central1}"
SERVICE_NAME="${FRONTEND_SERVICE_NAME:-marketing-campaign-frontend}"
IMAGE="gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest"

gcloud config set project "${PROJECT_ID}"

gcloud builds submit ../frontend --tag "${IMAGE}"

gcloud run deploy "${SERVICE_NAME}" \
  --image "${IMAGE}" \
  --region "${REGION}" \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars "NEXT_PUBLIC_API_BASE_URL=${API_BASE_URL}"

echo "Frontend deployed: ${SERVICE_NAME}"
