#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${PROJECT_ID:-}" ]]; then
  echo "PROJECT_ID is required"
  exit 1
fi

REGION="${REGION:-us-central1}"
SERVICE_NAME="${BACKEND_SERVICE_NAME:-marketing-campaign-backend}"
IMAGE="gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest"

if [[ -z "${GCS_BUCKET_NAME:-}" ]]; then
  echo "GCS_BUCKET_NAME is required"
  exit 1
fi

gcloud config set project "${PROJECT_ID}"

gcloud builds submit ../backend --tag "${IMAGE}"

gcloud run deploy "${SERVICE_NAME}" \
  --image "${IMAGE}" \
  --region "${REGION}" \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars "GOOGLE_CLOUD_PROJECT=${PROJECT_ID},GOOGLE_CLOUD_REGION=${REGION},GCS_BUCKET_NAME=${GCS_BUCKET_NAME},GEMINI_USE_VERTEX=true,CORS_ORIGINS=*"

echo "Backend deployed: ${SERVICE_NAME}"
