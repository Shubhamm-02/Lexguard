# LEXGUARD

AI Rights & Contract Intelligence System for the Google Prompt Wars problem statement.

LEXGUARD is a working prototype that turns contract text into an evidence-backed risk report: clause extraction, severity scoring, cross-clause reasoning, adversarial review perspectives, scenario impact, and negotiation-ready edits. It runs locally with no dependencies and can optionally add Google Document AI OCR, BigQuery telemetry, Vertex AI Gemini, and GPT-5.5 review paths.

Live demo: https://lexguard-739958449324.us-central1.run.app

## Chosen Vertical

LEXGUARD targets the legal-tech and contract-intelligence vertical. The focus is on helping employees, consumers, freelancers, vendors, and founders understand risky contract language before they sign.

## Approach And Logic

The system uses a hybrid workflow:

- A deterministic local analyzer extracts clauses, maps them to a CUAD-aligned 41-category taxonomy, scores risks, and generates explanations from the selected user role.
- Cross-clause logic looks for compound risks such as broad indemnity plus weak liability caps, auto-renewal plus no refund, or IP assignment plus sublicensing rights.
- Optional AI review layers through OpenAI GPT-5.5 or Vertex AI Gemini can act as a second reviewer, while the local engine remains the stable fallback.
- Google Document AI extracts readable text from PDFs and scanned/image uploads when configured.
- Optional BigQuery telemetry stores aggregate analysis metrics only, never raw contract text.

## How The Solution Works

1. The user selects a role lens such as employee, consumer, freelancer, vendor, or founder.
2. The user uploads or pastes a contract, policy, subscription term, MSA, offer letter, or similar document.
3. If the upload is a PDF/image, Document AI OCR extracts text before analysis.
4. LEXGUARD splits the text into clauses, classifies legal categories, detects risky patterns, and scores severity.
5. The review screen shows a risk speedometer, clause evidence, plain-English impact, scenario simulation, and negotiation asks.
6. Ask AI answers only contract-relevant questions grounded in the generated report.

## Assumptions Made

- LEXGUARD is decision support, not legal advice and not a replacement for a lawyer.
- The prototype prioritizes explainability and demo reliability over exhaustive jurisdiction-specific legal coverage.
- Uploaded contract text is processed for analysis; the browser does not persist raw uploaded text across refreshes.
- BigQuery telemetry, when enabled, logs only aggregate metadata such as score, risk level, document type, and finding counts.
- The deterministic analyzer is intentionally conservative: it should flag practical negotiation risks while no-risk samples can still return a clear report.

## Run Locally

```bash
npm start
```

Open `http://localhost:8080`.

Run the validation suite:

```bash
npm run check
npm test
```

## Optional Vertex AI Mode

Create `.env` from `.env.example` and set:

```bash
GOOGLE_CLOUD_PROJECT=your-gcp-project-id
AI_PROVIDER=vertex
VERTEX_LOCATION=global
VERTEX_MODEL=gemini-2.5-flash
```

Then authenticate locally:

```bash
gcloud auth application-default login
gcloud config set project your-gcp-project-id
npm start
```

The app will still fall back to the deterministic local risk engine if Vertex AI credentials are missing.

## Optional OpenAI GPT-5.5 Mode

Add your key to `.env`:

```bash
AI_PROVIDER=openai
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-5.5
OPENAI_REASONING_EFFORT=medium
```

Then restart:

```bash
npm start
```

The server keeps the API key out of browser code. LEXGUARD still runs locally if OpenAI is unavailable.

## What Makes It Stand Out

- Evidence-first clause analysis, not generic summarization.
- CUAD-aligned clause taxonomy covering 41 contract review categories.
- Optional GPT-5.5 second-review layer through the OpenAI Responses API.
- Optional Google BigQuery telemetry for privacy-safe aggregate evaluation metrics.
- Multi-perspective review board: rights advocate, contract counsel, risk officer, negotiation coach.
- Cross-clause reasoning for combined risks like indemnity plus liability caps.
- Scenario simulation for real-world consequences after cancellation, termination, disputes, or data use.
- Negotiation plan with fallback asks for each high-risk clause.
- GCP-ready architecture: Cloud Run frontend/API, Document AI OCR parsing, BigQuery scoring telemetry, Vertex AI Gemini reasoning, Cloud Storage, Firestore, and optional vector search.

## Optional BigQuery Telemetry

LEXGUARD can log aggregate analysis metrics to BigQuery without storing contract text:

```bash
GOOGLE_TELEMETRY_ENABLED=true
BIGQUERY_DATASET=lexguard_analytics
BIGQUERY_TABLE=analysis_events
```

The row contains risk score, level, detected document type, persona, finding counts, CUAD coverage, and engine mode. This gives judges a visible Google Services workflow while keeping uploaded contracts private.

## CUAD Dataset Workflow

Export the CUAD Q&A dataset:

```bash
npm run cuad:fetch
```

Generated dataset files are written to `data/cuad/` and ignored by git.

Analyze any text file from the CLI:

```bash
npm run analyze:file -- samples/employment-agreement.txt /tmp/lexguard-report.json
```

## LegalBench Evaluation Export

Export selected LegalBench configs for benchmark demos:

```bash
npm run legalbench:fetch
```

By default this exports `citation_prediction_classification` and `abercrombie` into `data/legalbench/`. These are evaluation assets for future citation support and trademark reasoning; CUAD remains the core contract-review dataset.

Run deterministic sample checks:

```bash
npm run test:samples
```

The sample suite includes high-risk contracts, one full CUAD/risk coverage contract, and no-risk contracts for employee, consumer, vendor, and consulting flows.

## Deploy To Cloud Run

```bash
gcloud config set project your-gcp-project-id
gcloud services enable run.googleapis.com cloudbuild.googleapis.com aiplatform.googleapis.com
gcloud builds submit --config cloudbuild.yaml
```

## Prototype Scope

The current upload supports text, Markdown, and PDF files. PDFs are extracted through Google Document AI OCR when `DOCUMENT_AI_PROCESSOR_ID` is configured.

This system provides legal awareness and decision support, not legal advice.
