# CUAD Integration Plan

CUAD v1 is useful because it gives LEXGUARD a recognized legal NLP benchmark instead of relying only on invented examples. The dataset contains more than 13,000 expert labels across 510 commercial contracts and 41 clause categories.

## How We Use It

1. Taxonomy grounding: `public/cuadTaxonomy.js` contains the 41 CUAD clause categories and maps them to LEXGUARD risk dimensions.
2. Evaluation corpus: `scripts/fetch_cuad.py` exports the Hugging Face dataset into local JSONL files under `data/cuad/`.
3. Clause coverage: every LEXGUARD report now includes `cuadReview`, which lists CUAD-style categories detected in the submitted contract.
4. Future retrieval: exported CUAD examples can become a RAG library of real clause examples for Gemini prompts and redline suggestions.

## Fetch The Dataset

```bash
npm run cuad:fetch
```

The generated files are intentionally ignored by git:

- `data/cuad/cuad_qa.jsonl`
- `data/cuad/contracts.jsonl`
- `data/cuad/stats.json`

## Why This Helps Judging

Most prototypes will say "AI summarizes legal documents." LEXGUARD can say: "Our extraction layer is aligned to CUAD, a legal contract review benchmark created by The Atticus Project and published at NeurIPS 2021."

## Next Step

Use `data/cuad/contracts.jsonl` to run batch evaluation:

```bash
npm run analyze:file -- samples/employment-agreement.txt /tmp/lexguard-report.json
```

Then compare `report.cuadReview.detectedLabels` against CUAD answer categories for recall.
