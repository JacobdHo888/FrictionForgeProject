# FrictionForge
*(originally codenamed Nightcrew) — Vertex AI Studio Frontend App with Node.js Backend*

**An autonomous agent crew that intercepts, verifies, and manages gig-based AI evaluation work while you're offline.**

Built for the **All Things Agentic Hackathon** — Taskmaster track.

This repository contains a frontend and a Node.js backend, designed to run together. The backend acts as a proxy, handling Google Cloud API calls (Vertex AI / Gemini 3.5, Gemma, Firestore, Gmail, and Calendar) and hosts all of FrictionForge's agent logic.

This project is intended for demonstration and prototyping purposes for the hackathon. It is not intended for use in a production environment.

---

## The Problem (Bring Your Own Friction)

Working across multiple AI-evaluation gig platforms means task-assignment emails arrive in inconsistent formats, across different inboxes, with different deadlines and pay structures — and no unified view of any of it. FrictionForge automates that busywork: it intercepts task emails as they land, extracts the details, double-checks its own extraction before trusting it, tracks pay across every platform in one ledger, and handles the follow-up logistics, without a human checking each platform by hand.

## What It Does

- **Intercepts** task-assignment emails in the background via Gmail push notifications — no polling, no manual inbox checks.
- **Filters noise** with a lightweight Gemma pass that discards newsletters and non-task email before spending a Gemini 3.5 call on it.
- **Extracts** structured task data (platform, task type, deadline, pay amount) from messy, inconsistent email formats using Gemini 3.5.
- **Verifies** every extraction with a second, independent Gemini 3.5 agent that checks it against the source text and flags anything ambiguous, contradictory, or fabricated instead of guessing.
- **Defends** against prompt injection in ingested email content — suspicious embedded instructions are routed to review, never silently followed.
- **Reconciles pay** across all platforms in a persistent Firestore ledger.
- **Acts** on confirmed tasks: blocks calendar time before the deadline and drafts (never auto-sends) a status reply.
- **Digests** the day's activity — what's closing soon, what needs manual review, what's been paid — once daily.
- **Visualizes** the whole system live as a dispatch console, not a static dashboard.

## Architecture

FrictionForge is event-sourced rather than a linear pipeline. Every stage writes an immutable, timestamped event to a shared Firestore "shift log," and each agent reacts to the event types it cares about instead of being called directly by a central controller.

```
Gmail (push) ─▶ Backend Ingestion ─▶ Gemma Triage ─▶ Extractor (Gemini 3.5)
                                                            │
                                                            ▼
                                                Verifier (Gemini 3.5)
                                                   │              │
                                            CONFIRMED        NEEDS_REVIEW /
                                                   │           REJECTED
                                                   ▼                │
                                          Firestore Ledger           ▼
                                                   │           Review Queue
                                       ┌───────────┴───────────┐
                                       ▼                        ▼
                               Calendar Block            Gmail Draft Reply

                    (all events also stream into the Shift Log,
                     read by the Digest Agent and Dispatch Console)
```

All of the above — ingestion, triage, extraction, verification, ledger writes, and action tools — runs inside the `backend/` Node.js/Express server. The `frontend/` app is the dispatch console that reads live from Firestore.

## Tech Stack

| Category | Used |
|---|---|
| AI Models | Gemini 3.5 (required — extraction, verification, digest), Gemma (triage filter) |
| SDK | Google Agent Development Kit (ADK) |
| Cloud Infra | Cloud Run, Pub/Sub, Firestore, Cloud Scheduler, Cloud Trace |
| Integrations | Gmail API, Google Calendar API |
| Backend | Node.js, Express |
| Frontend | Vertex AI Studio-generated frontend app |
| Observability | OpenTelemetry → Cloud Trace |

---

## Prerequisites

To run this application locally, you need:

- **[Google Cloud SDK / gcloud CLI](https://cloud.google.com/sdk/docs/install)**: Follow the instructions to install the SDK.
- **gcloud Initialization**:
  - Initialize the gcloud CLI:
    ```bash
    gcloud init
    ```
  - Authenticate for Application Default Credentials (needed to call Google Cloud APIs):
    ```bash
    gcloud auth application-default login
    ```
- **Node.js and npm**: Ensure you have Node.js and its package manager, `npm`, installed on your machine.
- **APIs enabled on your Google Cloud project**: Vertex AI, Firestore, Pub/Sub, Gmail, Calendar, Cloud Scheduler, Cloud Trace.
  ```bash
  gcloud services enable \
    aiplatform.googleapis.com \
    firestore.googleapis.com \
    pubsub.googleapis.com \
    gmail.googleapis.com \
    calendar-json.googleapis.com \
    cloudscheduler.googleapis.com \
    cloudtrace.googleapis.com
  ```
- A Gmail account with a dedicated `FrictionForge/Tasks` label, used to scope what the app is allowed to read.

## Project Structure

The project is organized into two main directories:

- `frontend/`: Contains the dispatch console frontend application code.
- `backend/`: Contains the Node.js/Express server code — this is where all agent logic (triage, extraction, verification, ledger, action tools, digest) lives, in addition to proxying Google Cloud API calls.
- `test_fixtures/`: The six test emails/payloads used to exercise the pipeline without a live Gmail connection.
- `proof/`: Screenshots and logs from a real end-to-end run, included for judging reproducibility.

## Backend Environment Variables

The `backend/.env.local` file is automatically generated when you download this application from Vertex AI Studio. It contains the base Google Cloud environment variables pre-configured from your project settings at download time:

- `API_BACKEND_PORT`: The port the backend API server listens on (e.g., `5000`).
- `API_PAYLOAD_MAX_SIZE`: The maximum size of the request payload accepted by the backend server (e.g., `5mb`).
- `GOOGLE_CLOUD_LOCATION`: The Google Cloud region associated with your project.
- `GOOGLE_CLOUD_PROJECT`: Your Google Cloud Project ID.

FrictionForge adds the following variables on top of the base scaffold, which you'll need to set yourself:

- `GMAIL_WATCH_LABEL`: The Gmail label FrictionForge watches (default `FrictionForge/Tasks`).
- `PUBSUB_TOPIC` / `PUBSUB_SUBSCRIPTION`: Names for the Gmail push topic and subscription.
- `GMAIL_OAUTH_CLIENT_ID` / `GMAIL_OAUTH_CLIENT_SECRET`: Read-scoped Gmail credentials.
- `GMAIL_DRAFT_OAUTH_CLIENT_ID` / `GMAIL_DRAFT_OAUTH_CLIENT_SECRET`: Separate write-scoped credentials, used only for drafting replies — kept distinct from the read credentials on purpose.
- `CALENDAR_OAUTH_CLIENT_ID` / `CALENDAR_OAUTH_CLIENT_SECRET`: Calendar write credentials.
- `FIRESTORE_COLLECTION_PREFIX`: Prefix for the `tasks`, `ledger`, and `shift_log` collections (default `frictionforge`).

**Note:** The base four variables are auto-populated during download. Everything else above needs to be added manually to `backend/.env.local`.

## Installation and Running the App Locally

Install dependencies for both the frontend and backend, then run:

```bash
npm install && npm run dev
```

This starts the backend proxy (agent logic, Gmail/Calendar/Firestore calls) and the frontend dispatch console together.

### Running against the test fixtures (no live Gmail required)

```bash
npm run replay-fixtures
```

This loads the six fixtures in `test_fixtures/` directly into the triage → extraction → verification pipeline, bypassing Gmail and Pub/Sub entirely, so the core logic can be exercised offline. See `test_fixtures/README.md` for what each fixture is designed to test.

### Registering the live Gmail watch (for real end-to-end testing)

```bash
npm run register-watch
```

Registers the initial `users.watch()` subscription against the `FrictionForge/Tasks` label and creates the Pub/Sub topic/subscription pointing at your running backend.

---

## Deploying to Google Cloud

While the app runs locally by default, it's deployed to Cloud Run for the hackathon submission as proof of real Google Cloud infrastructure use:

```bash
gcloud run deploy frictionforge \
  --source . \
  --region=YOUR_REGION \
  --allow-unauthenticated=false \
  --set-env-vars-file=backend/.env.local
```

The daily digest is scheduled separately:

```bash
gcloud scheduler jobs create http frictionforge-digest \
  --schedule="0 8 * * *" \
  --uri="YOUR_CLOUD_RUN_URL/digest/run" \
  --http-method=POST
```

## Reproducibility Note

This project does not need to remain live at the moment of judging. `/proof/` in this repo contains screenshots and logs of a full real run — a live Gmail push triggering ingestion, correct extraction and verification, a written calendar event and Gmail draft, and a Cloud Trace view of the complete per-task reasoning chain — as proof it was built and deployed on Google Cloud.

## Security Notes

- Gmail read, Gmail draft, and Calendar write each use separate, independently revocable OAuth credentials.
- The draft-reply tool can only call `drafts.create()` — there is no code path to `send()`.
- Ingested email content passes through an injection-sanitization stage before reaching the extractor; anything suspicious is routed to the review queue instead of being stripped and silently continued.
- Firestore writes are restricted to the backend's service account via Firestore security rules — no client-side writes.

## What's Next

- Broader platform coverage beyond email-based notifications
- Expanded Gemma triage for more ambiguous borderline cases
- A configurable rule layer so the digest can be tuned per platform
