# BriefToBrand

Production-ready multimodal campaign generation system built for the **Gemini Live Agent Challenge** (Creative Storyteller category).

It acts as an AI creative director that takes a brief product input and generates:
- campaign strategy
- brand tone and slogan
- marketing copy
- social posts and hashtags
- ad headlines
- video storyboard and narration
- Gemini-generated visual assets
- interleaved multimedia output (text + image blocks)

## Tech Stack

- Frontend: Next.js (TypeScript)
- Backend: Express.js (Node.js)
- AI: Gemini via Google GenAI SDK (Vertex AI mode)
- Cloud: Cloud Run, Cloud Storage, Firestore

## Repository Structure

```txt
marketing-campaign-agent/
  frontend/
  backend/
    src/
      index.js
      config.js
      schemas.js
      routes/
        campaigns.js
      services/
        geminiService.js
        campaignGenerator.js
  cloud/
  docs/
  README.md
```

## 1. Backend Setup (Local)

```bash
cd backend
cp .env.example .env
# Fill in GOOGLE_CLOUD_PROJECT and GCS_BUCKET_NAME (or set GEMINI_USE_VERTEX=false and GEMINI_API_KEY)
npm install
npm run dev
```

## 2. Frontend Setup (Local)

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

App URL: `http://localhost:3000`
Backend URL: `http://localhost:8080`

## 3. API Contract

### POST `/api/v1/campaigns/generate`

Request body:

```json
{
  "product_name": "Smart Hydration Bottle",
  "product_description": "A self-cleaning, app-connected hydration bottle with hydration reminders.",
  "target_audience": "Fitness enthusiasts",
  "platforms": ["Instagram", "TikTok"],
  "campaign_goal": "Product launch",
  "brand_style": "Energetic and premium"
}
```

Response includes:
- `content` (all structured campaign sections)
- `visual_assets` (generated image URLs + prompts)
- `interleaved_output` (mixed text and image stream)

## 4. Prompt Engineering Notes

Prompt design is implemented in `backend/src/services/geminiService.js`.

Key patterns:
- strict JSON schema output
- platform-tailored copy rules
- storyboard scene count constraints
- quality constraints for ad language and performance prediction

## 5. Google Cloud Deployment

Prerequisites:
- `gcloud` CLI configured
- Billing enabled
- APIs: Cloud Run, Artifact Registry/Cloud Build, Firestore, Vertex AI, Storage

Create resources:

```bash
gcloud config set project <PROJECT_ID>
gcloud services enable run.googleapis.com cloudbuild.googleapis.com aiplatform.googleapis.com firestore.googleapis.com storage.googleapis.com

gcloud firestore databases create --region=us-central

gsutil mb -l us-central1 gs://<GCS_BUCKET_NAME>
```

Deploy backend:

```bash
cd cloud
PROJECT_ID=<PROJECT_ID> REGION=us-central1 GCS_BUCKET_NAME=<GCS_BUCKET_NAME> ./deploy-backend.sh
```

Deploy frontend:

```bash
cd cloud
PROJECT_ID=<PROJECT_ID> REGION=us-central1 API_BASE_URL=<BACKEND_CLOUD_RUN_URL> ./deploy-frontend.sh
```

## 6. Production Notes

- Restrict CORS to frontend domain in production.
- Prefer signed URLs for private assets instead of `make_public()` if required by policy.
- Add authentication (Firebase Auth or IAP) for multi-tenant usage.
- Use Cloud Logging + Error Reporting for observability.

## 7. Hackathon Bonus Hooks Included

- Storyboard keyframe image generation for video concept
- Performance prediction field in campaign output
- Brand style customization input
- Download campaign JSON and copy in frontend

## 8. Example Campaign Output (Condensed)

Input:
- Product: Smart Hydration Bottle
- Audience: Fitness enthusiasts
- Goal: Product launch
- Platform: Instagram, TikTok

Generated highlights:
- Concept: "Hydrate Like You Mean It"
- Tone: Motivational, sleek, energetic
- Slogan: "Every Sip, Stronger You"
- Ad headlines:
  - "Your Workout Has a New Water Coach"
  - "Hydration That Trains With You"
- Visual assets:
  - Hero product image
  - Instagram creative
  - Launch poster
  - Storyboard keyframe

## 9. Architecture

- Diagram source: `docs/architecture.mmd`
- Description: `docs/architecture.md`
