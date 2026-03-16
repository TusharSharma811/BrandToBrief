# Architecture Diagram Description

The AI Marketing Campaign Maker uses a layered architecture designed for production deployment on Google Cloud.

## Components

1. Frontend (Next.js)
- Accepts campaign brief input from user.
- Sends generation requests to backend API.
- Renders campaign sections and interleaved media stream.
- Supports downloading campaign copy and JSON.

2. Backend (Express.js on Cloud Run)
- Validates user input.
- Calls Gemini text model to generate structured campaign JSON.
- Calls Gemini image-capable model to generate visual assets.
- Uploads generated image bytes to Cloud Storage.
- Persists campaign records in Firestore.
- Returns interleaved text/image response to frontend.

3. AI Layer (Gemini via Vertex AI)
- Text generation for strategy, copy, social content, storyboard, and prediction.
- Multimodal image generation for hero, social creative, poster, and storyboard keyframe.

4. Storage Layer
- Cloud Storage bucket for generated media assets.
- Firestore collection for campaign data and metadata.

## Request Flow

1. User submits brief from frontend.
2. Backend builds prompt and requests campaign JSON from Gemini.
3. Backend requests multiple campaign images from Gemini.
4. Generated images are uploaded to Cloud Storage.
5. Campaign JSON + media links are stored in Firestore.
6. Backend assembles an interleaved multimedia response.
7. Frontend renders campaign preview and downloads.
