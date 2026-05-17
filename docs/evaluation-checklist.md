# LEXGUARD Evaluation Checklist

Use this as the final judging map for the six review areas.

## Code Quality

- Modular runtime: `server.js`, `public/analyzer.js`, `public/cuadTaxonomy.js`, `src/documentai.js`, `src/openai.js`, and `src/gemini.js` have clear ownership.
- Deterministic local analyzer works without cloud credentials, making demos repeatable.
- Dataset utilities are isolated under `scripts/` and generated data is ignored by git.
- Syntax checks run across JavaScript and Python with `npm run check`.

## Security

- API keys stay server-side in `.env`; `.env` is ignored by git.
- Browser receives only non-secret config through `/api/config`.
- Uploads are bounded by `MAX_UPLOAD_BYTES`.
- Document extraction uses a MIME allowlist for PDF, PNG, JPEG, and TIFF.
- Responses include security headers: CSP, `nosniff`, no-referrer, same-origin resource policy, and restricted browser permissions.
- Ask AI is available only after analysis and rejects unrelated questions.
- AI failures degrade to local answers instead of exposing stack traces or blocking the demo.

## Efficiency

- Local analyzer runs instantly and does not call an LLM for every interaction.
- OpenAI, Vertex AI, and Document AI requests have timeouts and local fallbacks.
- Static app has no frontend build step or heavy dependency chain.
- File uploads are processed in memory only for the demo prototype and constrained by size limits.

## Testing

- `npm run check` validates JavaScript and Python syntax.
- `npm run test:samples` validates high-risk detection, CUAD category coverage, and no-risk quiet behavior.
- `samples/category-coverage-contract.txt` confirms 20/20 practical risk findings and 41/41 CUAD categories.
- No-risk samples for employee, consumer, vendor, and consulting flows confirm the system can return `Clear`.
- `scripts/fetch_legalbench.py --max-rows 1` smoke-tests the LegalBench exporter when network access is available.

## Accessibility

- Semantic sections, nav landmarks, buttons, dialog roles, tab roles, labels, focus states, and live regions are present.
- Theme button has a single self-explanatory icon and accessible label.
- Upload and chat status updates use polite live regions.
- Keyboard focus is visible and all primary controls are native buttons, inputs, or textarea elements.
- Dark mode improves contrast for projection and low-light demos.

## Google Services

- Google Document AI OCR extracts text from PDF uploads through the configured processor.
- Vertex AI Gemini path remains available through `AI_PROVIDER=vertex`.
- Cloud Run deployment files are present with `cloudbuild.yaml` and `Dockerfile`.
- The architecture plan maps future production storage and evaluation to Cloud Storage, Firestore, BigQuery, and Vertex AI Vector Search.

## Final Demo Proof

Run these before presenting:

```bash
npm run check
npm run test:samples
npm start
```

Then upload:

1. `samples/no-risk-subscription-terms.txt` to prove LEXGUARD does not create fake risk.
2. `samples/vendor-msa-red-flags.txt` to show clause evidence, risk score, and negotiation asks.
3. A PDF sample to prove Google Document AI extraction.
