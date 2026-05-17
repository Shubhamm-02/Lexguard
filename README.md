# LEXGUARD

AI Rights & Contract Intelligence System for the Google Prompt Wars problem statement.

LEXGUARD is a working prototype that turns contract text into an evidence-backed risk report: clause extraction, severity scoring, cross-clause reasoning, adversarial review perspectives, scenario impact, and negotiation-ready edits. It runs locally with no dependencies and can optionally add a Vertex AI Gemini review layer using your GCP project.

## Run Locally

```bash
npm start
```

Open `http://localhost:8080`.

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
- Multi-perspective review board: rights advocate, contract counsel, risk officer, negotiation coach.
- Cross-clause reasoning for combined risks like indemnity plus liability caps.
- Scenario simulation for real-world consequences after cancellation, termination, disputes, or data use.
- Negotiation plan with fallback asks for each high-risk clause.
- GCP-ready architecture: Cloud Run frontend/API, Vertex AI Gemini reasoning, Document AI OCR parsing, Cloud Storage, Firestore/BigQuery, and optional vector search.

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
