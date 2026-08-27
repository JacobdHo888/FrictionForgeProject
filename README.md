FrictionForge

(originally codenamed Nightcrew)

An autonomous agent crew that intercepts, verifies, and manages gig-based AI evaluation work while you're offline.

Built for the All Things Agentic Hackathon — Taskmaster track — using Google Cloud Agent Platform Studio.

The Problem (Bring Your Own Friction)

Working across multiple AI-evaluation gig platforms means task-assignment emails arrive in inconsistent formats, across different inboxes, with different deadlines and pay structures — and no unified view of any of it. FrictionForge automates that busywork: it intercepts task emails as they land, extracts the details, double-checks its own extraction before trusting it, tracks pay across every platform in one ledger, and handles the follow-up logistics, without a human checking each platform by hand.

What It Does
Intercepts task-assignment emails via Gmail push notifications.
Filters noise with a Gemma triage pass that discards newsletters and non-task email before spending a Gemini 3.5 call on it.
Extracts structured task data (platform, task type, deadline, pay amount) from messy, inconsistent email formats using Gemini 3.5.
Verifies every extraction with a second, independent Gemini 3.5 agent that checks it against the source text and flags anything ambiguous, incomplete, contradictory, or fabricated instead of guessing.
Defends against prompt injection in ingested email content — suspicious embedded instructions are quarantined, never silently followed.
Reconciles pay across all platforms in a persistent ledger.
Acts on confirmed tasks: blocks calendar time before the deadline and drafts (never auto-sends) a status reply.
Visualizes the whole system live as a dispatch console — shift log, ledger totals, and review queue, updating in real time.
Architecture

FrictionForge is event-sourced rather than a linear pipeline. Every stage writes a timestamped event to the shift log, and downstream stages react to the event types they care about.

Gmail (push) ─▶ Ingestion ─▶ Gemma Triage ─▶ Extractor (Gemini 3.5)
                                                    │
                                                    ▼
                                        Verifier (Gemini 3.5)
                                           │              │
                                    CONFIRMED       NEEDS_REVIEW /
                                           │          QUARANTINED
                                           ▼               │
                                  Firestore Ledger           ▼
                                           │           Review Queue
                              ┌────────────┴────────────┐
                              ▼                          ▼
                      Calendar Block              Gmail Draft Reply

                 (every stage also writes to the Shift Log,
                  which powers the Dispatch Console below)
Tech Stack
Category	Used
AI Models	Gemini 3.5 (required — extraction, verification), Gemma (triage filter)
Platform	Google Cloud Agent Platform Studio
Cloud Infra	Cloud Run (deployment), Vertex AI
Integrations	Gmail API, Google Calendar API
Frontend	React (Dispatch Console)
Backend	TypeScript services (agentService.ts, calendarTool.ts, draftComposerTool.ts)
How to Run This Project
Option A — Run directly in Agent Platform Studio (fastest)

No install required — this is how the project was built and is the quickest way to see it work.

Open the project in Google Cloud Agent Platform Studio and select FrictionForge Dispatch Console from Recents (or App Builder).
Click Preview in the top right to load the live dispatch console.
Under Signal Injector, use the Test Fixtures dropdown to select one of the six pre-built fixtures (or paste your own raw email/JSON payload into the Payload field).
Click Transmit Signal.
Watch the Shift Log panel — you'll see each stage fire in order (triage → sanitizer → extractor → verifier → ledger/action tools or review queue), and the Ledger Totals and Review Queue panels update live on the right.
Option B — Download and run locally
From the Studio project, open the Code tab and download the source.
Unzip it — the project has frontend/ and backend/ (Node.js/Express) directories.
backend/.env.local is auto-generated with your Google Cloud project settings (API_BACKEND_PORT, API_PAYLOAD_MAX_SIZE, GOOGLE_CLOUD_LOCATION, GOOGLE_CLOUD_PROJECT). Confirm these are correct for your own project.
Authenticate so the backend can call Google Cloud APIs:
bash
   gcloud init
   gcloud auth application-default login
Install and run:
bash
   npm install && npm run dev
Open the local URL shown in your terminal. The Signal Injector and fixture dropdown work the same as in Option A.
Testing with the fixtures

Six fixtures are included, each testing a different pipeline behavior:

Fixture	Tests
1 — Cognivue Task	Clean extraction, ends CONFIRMED
2 — Missing Info	Missing deadline/pay correctly stops at NEEDS_REVIEW
3 — Adversarial/Tricky	Verifier correctly attributes the right date/amount among decoys
4 — Noise/Newsletter	Gemma triage filters it out before extraction
5 — Prompt Injection	Sanitizer catches it; task is QUARANTINED
6 — Stale History ID	Simulated missed webhook; tests watch-refresh fallback
Deploying to Cloud Run (proof of Google Cloud deployment)
In Studio, click the cloud icon dropdown next to the app name in the top bar (next to "FrictionForge Dispatch Console").
Select Deploy to Cloud Run.
Wait for the build to finish — Studio returns a stable https://*.run.app URL.
Open that URL directly to confirm the deployed app loads and behaves the same as the Preview.
Confirm the deployment in the Cloud Console:
Cloud Run dashboard: console.cloud.google.com/run?project=YOUR_PROJECT_ID — the service should be listed as Serving, with visible request activity.
Vertex AI logs: console.cloud.google.com/vertex-ai — shows the Gemini 3.5 and Gemma requests made during a run.
Security Notes
Gmail read, Gmail draft, and Calendar write use separate, independently scoped credentials.
The draft-reply tool can only call drafts.create() — there is no code path to send().
Ingested email content passes through an injection-sanitization stage before reaching the extractor; anything suspicious is quarantined instead of stripped and silently continued.
A CONFIRMED verdict requires deadline, pay_amount, and platform to all be present and valid — incomplete extractions are routed to review, never acted on.
What's Next
Broader platform coverage beyond email-based notifications
Expanded Gemma triage for more ambiguous borderline cases
A configurable rule layer so the digest can be tuned per platform
Repo Structure
FrictionForgeProject/
├── index.html
├── App.tsx
├── services/
│   ├── agentService.ts          # triage, extractor, verifier, ledger, digest logic
│   ├── calendarTool.ts
│   └── draftComposerTool.ts
├── components/
│   ├── PayloadInjector.tsx      # Signal Injector UI
│   ├── DispatchLog.tsx          # Shift Log UI
│   ├── ActiveShiftPanel.tsx
│   └── Dashboard.tsx            # Ledger totals / review queue
├── test_fixtures/               # the six test fixtures
└── backend/.env.local           # auto-generated Google Cloud config
