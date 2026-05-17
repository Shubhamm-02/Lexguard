# LEXGUARD Architecture

## Product Goal

LEXGUARD helps a person understand what can go wrong before signing a contract. The judging differentiator is explainable reasoning: every risk is attached to clause evidence, real-world impact, severity, and a negotiation ask.

## Runtime Flow

1. User uploads or pastes a contract.
2. Parser normalizes text and splits clauses.
3. CUAD taxonomy layer maps clauses to 41 contract-review categories.
4. Local risk engine detects legal risk patterns, vague language, mitigators, and intensifiers.
5. Cross-clause reasoner checks compound risk such as auto-renewal plus no refund or indemnity plus liability cap asymmetry.
6. Optional OpenAI GPT-5.5 or Vertex AI Gemini layer reviews the local report and returns missed risks, cross-clause observations, and negotiation priorities.
7. Privacy-safe aggregate metrics can be sent to BigQuery for evaluation dashboards without storing raw contract text.
8. UI renders a risk radar, clause map, adversarial review board, scenario simulation, and negotiation plan.

## Google Cloud Design

- Cloud Run: deploys the Node server and static dashboard.
- Vertex AI Gemini: adds model-based legal reasoning over the deterministic findings.
- Document AI: extracts text from PDFs, DOCX exports, scans, signatures, and tables.
- Cloud Storage: stores uploaded source documents and generated JSON reports.
- Firestore: stores report metadata, user sessions, saved negotiations, and audit events.
- BigQuery: receives privacy-safe aggregate analysis metrics and evaluates detection behavior across demo contracts and judge test cases.
- Vertex AI Vector Search: optional retrieval over legal benchmarks, internal clause library, fallback language, and jurisdiction notes.

## Why A Hybrid Engine

The local risk engine is deterministic and auditable. It gives stable evidence, scoring, and UI output even without credentials. Gemini then acts as a second reviewer, not a black-box replacement. This makes the system more explainable and easier to defend during judging.

## Current Implementation

- `public/analyzer.js`: clause extraction, risk scoring, obligation extraction, ambiguity analysis, negotiation plan, and scenario simulation.
- `public/cuadTaxonomy.js`: CUAD-inspired 41-category clause taxonomy mapped to LEXGUARD risk dimensions.
- `scripts/fetch_cuad.py`: optional Hugging Face CUAD exporter for evaluation and retrieval experiments.
- `scripts/fetch_legalbench.py`: optional LegalBench exporter for citation-support and trademark-reasoning benchmark demos.
- `src/documentai.js`: Google Document AI OCR integration for PDF/image extraction.
- `src/bigquery.js`: Google BigQuery insertAll integration for aggregate scoring telemetry.
- `src/gemini.js`: optional Vertex AI REST integration.
- `src/openai.js`: optional OpenAI Responses API integration for GPT second review and chat.
- `server.js`: static server and `/api/analyze` endpoint.
- `public/app.js`: dashboard rendering and local fallback.

## Next Competition Upgrades

- Add a benchmark library of "fair clause" alternatives by contract type.
- Add jurisdiction presets for India, US federal, California, EU consumer/privacy, and remote-work employment.
- Add a redline generator that rewrites risky clauses into balanced alternatives.
- Add evaluation notebooks with precision/recall on public contracts.
