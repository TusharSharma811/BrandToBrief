# BriefToBrand Documentation

## Overview

BriefToBrand is a full-stack marketing campaign generator that turns a structured product brief into:

- campaign strategy
- landing page and email copy
- ad headlines and social captions
- generated campaign visuals
- storyboard scenes and narration
- downloadable JSON and copy exports

The project has two primary surfaces:

- `frontend/`: a Next.js application with the landing page, generator workspace, and campaign results dashboard
- `backend/`: an Express API that generates campaign content, image assets, and campaign persistence

## Core Experience

The redesigned frontend is organized as a guided funnel instead of a single flat form:

1. Visitors land on a marketing-style homepage at `/` that explains the product value and output.
2. Users move to the dedicated generator workspace at `/generate` and fill out the brief.
3. The app sends the brief to the backend generation endpoint.
4. The backend returns a structured campaign response and campaign ID.
5. The frontend routes the user to `/campaign/[campaignId]`.
6. The results page renders the campaign as a review-friendly dashboard.
7. Users download the campaign JSON or copy artifacts for handoff and reuse.

## Tech Stack

### Frontend

- Next.js 14
- React 18
- TypeScript
- global CSS with custom visual system

### Backend

- Node.js
- Express
- Zod validation
- Gemini for campaign text generation
- configurable image provider support
- local file fallback or Firestore persistence depending environment

## Key Frontend Areas

### Landing Page

The landing page introduces the product with:

- a hero section with clear value proposition
- proof and benefit cards
- a workflow explanation
- a direct transition into the generator workspace

Route:

- `/`

### Generator Workspace

The generator form is organized into four parts:

1. Product
2. Audience and objective
3. Brand direction
4. Distribution channels

This structure reduces ambiguity for first-time users and makes the brief easier to complete.

Route:

- `/generate`

### Results Dashboard

Generated campaigns are displayed in grouped sections:

- strategic direction
- copy system
- visual asset gallery
- storyboard
- social rollout
- interleaved multimedia stream

This makes campaign review easier for cross-functional teams.

Route:

- `/campaign/[campaignId]`

## Backend Summary

The backend exposes:

- `POST /api/v1/campaigns/generate`
- `GET /api/v1/campaigns/:campaign_id`

Generation flow:

1. Validate the incoming brief.
2. Build a campaign prompt.
3. Generate structured campaign text.
4. Generate image assets.
5. Persist the result.
6. Return a unified response object to the frontend.

## User Flows

### Flow 1: First-time visitor

1. User opens the app.
2. User reads the landing page to understand what the product creates.
3. User clicks the call to action to open the generator workspace.
4. User sees a guided brief form instead of a blank creative canvas.

### Flow 2: Marketer creates a campaign

1. User fills in product name and description.
2. User defines the target audience and campaign goal.
3. User chooses a brand style and target platforms.
4. User submits the form.
5. User waits while the backend generates content and assets.
6. User is automatically taken to the results section.
7. User reviews positioning, copy, visuals, and storyboard outputs.
8. User downloads JSON or campaign copy for reuse.

### Flow 3: Founder reviews a generated concept

1. Founder receives a generated campaign from a teammate.
2. Founder reviews the concept, slogan, and landing headline first.
3. Founder scans the messaging pillars and performance outlook.
4. Founder checks whether the selected platforms match launch priorities.
5. Founder approves, revises, or regenerates with a new brief.

### Flow 4: Content or design collaborator uses outputs

1. Collaborator opens the results dashboard.
2. Collaborator checks generated visual assets and prompts.
3. Collaborator reviews storyboard scenes and social captions.
4. Collaborator downloads the copy or JSON artifact.
5. Collaborator adapts the output into final production assets.

### Flow 5: Developer extends the project

1. Developer starts frontend and backend locally.
2. Developer updates environment variables for text and image providers.
3. Developer modifies prompt logic, UI sections, or storage behavior.
4. Developer validates the flow by generating a campaign from the frontend.

## Environment Notes

### Frontend

Frontend API base URL:

- `NEXT_PUBLIC_API_BASE_URL`

### Backend

Important backend variables include:

- `GEMINI_API_KEY`
- `GEMINI_USE_VERTEX`
- `IMAGE_PROVIDER`
- `HUGGING_FACE_API_KEY`
- `HUGGING_FACE_IMAGE_MODEL`
- `CAMPAIGN_STORAGE_DIR`

## UX Goals of the Redesign

The new UI was designed to improve:

- discoverability for first-time users
- clarity of what inputs are needed
- confidence during generation
- readability of generated outputs
- export and handoff for real campaign work

## Suggested Next Improvements

- add campaign history in the frontend using saved campaign IDs
- add editable post-generation sections for quick refinement
- support multiple visual themes or industry-specific brief templates
- add authentication and team workspaces for shared campaign review
