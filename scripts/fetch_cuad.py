#!/usr/bin/env python3
"""Fetch CUAD from Hugging Face and export a compact JSONL review corpus.

Usage:
  python3 -m pip install -r requirements-cuad.txt
  python3 scripts/fetch_cuad.py

The script intentionally keeps generated data out of git. It writes to data/cuad/.
"""

from __future__ import annotations

import argparse
import io
import json
import re
import shutil
import urllib.request
import zipfile
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any, Iterable


CUAD_QA_DATASET = "theatticusproject/cuad-qa"
CUAD_QA_SOURCE_URL = "https://github.com/TheAtticusProject/cuad/raw/main/data.zip"
CUAD_QA_SOURCE_FILES = {
    "train": "train_separate_questions.json",
    "test": "test.json",
}


CUAD_LABELS = [
    "Document Name",
    "Parties",
    "Agreement Date",
    "Effective Date",
    "Expiration Date",
    "Renewal Term",
    "Notice Period to Terminate Renewal",
    "Governing Law",
    "Most Favored Nation",
    "Non-Compete",
    "Exclusivity",
    "No-Solicit of Customers",
    "Competitive Restriction Exception",
    "No-Solicit of Employees",
    "Non-Disparagement",
    "Termination for Convenience",
    "Rofr/Rofo/Rofn",
    "Change of Control",
    "Anti-Assignment",
    "Revenue/Profit Sharing",
    "Price Restrictions",
    "Minimum Commitment",
    "Volume Restriction",
    "IP Ownership Assignment",
    "Joint IP Ownership",
    "License Grant",
    "Non-Transferable License",
    "Affiliate License-Licensor",
    "Affiliate License-Licensee",
    "Unlimited/All-You-Can-Eat License",
    "Irrevocable or Perpetual License",
    "Source Code Escrow",
    "Post-Termination Services",
    "Audit Rights",
    "Uncapped Liability",
    "Cap on Liability",
    "Liquidated Damages",
    "Warranty Duration",
    "Insurance",
    "Covenant Not to Sue",
    "Third Party Beneficiary",
]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", default=CUAD_QA_DATASET)
    parser.add_argument("--out", default="data/cuad")
    parser.add_argument("--max-rows", type=int, default=0, help="Optional cap for quick smoke tests.")
    args = parser.parse_args()

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    dataset = load_source_dataset(args.dataset, out_dir)
    qa_path = out_dir / "cuad_qa.jsonl"
    contract_path = out_dir / "contracts.jsonl"
    stats_path = out_dir / "stats.json"

    label_counts: Counter[str] = Counter()
    split_counts: Counter[str] = Counter()
    contract_contexts: dict[str, dict[str, Any]] = {}
    rows_written = 0

    with qa_path.open("w", encoding="utf-8") as qa_file:
        for split_name, split in dataset.items():
            for row in split:
                normalized = normalize_row(row, split_name)
                if not normalized:
                    continue

                label_counts[normalized["category"]] += 1
                split_counts[split_name] += 1
                rows_written += 1
                qa_file.write(json.dumps(normalized, ensure_ascii=False) + "\n")

                title = normalized.get("title") or normalized["id"].split("__")[0]
                context = normalized.get("context") or ""
                if title and context and title not in contract_contexts:
                    contract_contexts[title] = {
                        "title": title,
                        "context": context,
                        "word_count": len(re.findall(r"\\b[\\w'-]+\\b", context)),
                    }

                if args.max_rows and rows_written >= args.max_rows:
                    break
            if args.max_rows and rows_written >= args.max_rows:
                break

    with contract_path.open("w", encoding="utf-8") as contract_file:
        for item in contract_contexts.values():
            contract_file.write(json.dumps(item, ensure_ascii=False) + "\n")

    stats = {
        "dataset": args.dataset,
        "qa_rows": rows_written,
        "unique_contracts": len(contract_contexts),
        "known_cuad_categories": len(CUAD_LABELS),
        "split_counts": dict(split_counts),
        "category_counts": dict(label_counts.most_common()),
        "outputs": {
            "qa": str(qa_path),
            "contracts": str(contract_path),
        },
    }
    stats_path.write_text(json.dumps(stats, indent=2, ensure_ascii=False), encoding="utf-8")

    readme = out_dir / "README.md"
    readme.write_text(
        "# CUAD Local Export\n\n"
        f"Generated from CUAD Q&A source `{args.dataset}`.\n\n"
        "- `cuad_qa.jsonl`: question-answer style rows with inferred CUAD category.\n"
        "- `contracts.jsonl`: one context per contract title when available.\n"
        "- `stats.json`: split and category counts.\n\n"
        "Use this export for evaluation, retrieval examples, and demo evidence. Do not commit raw generated data unless competition rules require it.\n",
        encoding="utf-8",
    )

    print(json.dumps(stats, indent=2, ensure_ascii=False))


def load_source_dataset(dataset_name: str, out_dir: Path) -> dict[str, Iterable[dict[str, Any]]]:
    normalized_name = dataset_name.strip().lower()
    if normalized_name in {CUAD_QA_DATASET, "cuad-qa"}:
        return load_cuad_qa_direct(out_dir)

    if normalized_name == "theatticusproject/cuad":
        raise SystemExit(
            "This exporter needs the CUAD Q&A rows. Use `--dataset theatticusproject/cuad-qa` "
            "or omit `--dataset` to use that default."
        )

    try:
        from datasets import load_dataset
    except ImportError as exc:
        raise SystemExit(
            "Missing dependency: install with `python3 -m pip install -r requirements-cuad.txt`."
        ) from exc

    return load_dataset(dataset_name)


def load_cuad_qa_direct(out_dir: Path) -> dict[str, Iterable[dict[str, Any]]]:
    source_dir = out_dir / "_source"
    source_dir.mkdir(parents=True, exist_ok=True)
    zip_path = source_dir / "cuad_data.zip"

    if not zip_path.exists():
        download_file(CUAD_QA_SOURCE_URL, zip_path)

    return {
        split_name: iter_cuad_qa_zip(zip_path, source_file)
        for split_name, source_file in CUAD_QA_SOURCE_FILES.items()
    }


def download_file(url: str, destination: Path) -> None:
    tmp_path = destination.with_suffix(destination.suffix + ".tmp")
    print(f"Downloading {url} to {destination}")
    with urllib.request.urlopen(url) as response, tmp_path.open("wb") as target:
        shutil.copyfileobj(response, target)
    tmp_path.replace(destination)


def iter_cuad_qa_zip(zip_path: Path, source_file: str) -> Iterable[dict[str, Any]]:
    with zipfile.ZipFile(zip_path) as archive:
        member_name = find_zip_member(archive, source_file)
        with archive.open(member_name) as raw_file:
            payload = json.load(io.TextIOWrapper(raw_file, encoding="utf-8"))

    for example in payload.get("data", []):
        title = str(example.get("title") or "").strip()
        for paragraph in example.get("paragraphs", []):
            context = str(paragraph.get("context") or "").strip()
            for qa in paragraph.get("qas", []):
                answers = qa.get("answers") or []
                yield {
                    "id": str(qa.get("id") or ""),
                    "title": title,
                    "context": context,
                    "question": str(qa.get("question") or "").strip(),
                    "answers": {
                        "answer_start": [answer.get("answer_start", 0) for answer in answers],
                        "text": [str(answer.get("text") or "").strip() for answer in answers],
                    },
                }


def find_zip_member(archive: zipfile.ZipFile, source_file: str) -> str:
    matches = [name for name in archive.namelist() if name.endswith(source_file)]
    if not matches:
        available = ", ".join(archive.namelist()[:10])
        raise FileNotFoundError(f"Could not find {source_file} in {archive.filename}. Found: {available}")
    return matches[0]


def normalize_row(row: dict[str, Any], split_name: str) -> dict[str, Any] | None:
    row_id = str(row.get("id") or row.get("qa_id") or row.get("question_id") or "")
    title = str(row.get("title") or row.get("document_title") or row.get("contract_name") or "")
    context = str(row.get("context") or row.get("paragraph") or row.get("text") or "")
    question = str(row.get("question") or row.get("query") or "")
    answers = normalize_answers(row.get("answers") or row.get("answer") or row.get("label"))

    category = infer_category(question, row_id)
    if not question and not context and not answers:
        return None

    return {
        "id": row_id or f"{split_name}__{abs(hash((title, question, context[:120])))}",
        "split": split_name,
        "title": title,
        "category": category,
        "question": question,
        "answers": answers,
        "is_impossible": len(answers) == 0,
        "context": context,
    }


def normalize_answers(raw: Any) -> list[str]:
    if raw is None:
        return []
    if isinstance(raw, str):
        return [raw] if raw.strip() else []
    if isinstance(raw, list):
        return [str(item) for item in raw if str(item).strip()]
    if isinstance(raw, dict):
        texts = raw.get("text") or raw.get("texts") or raw.get("answer_text")
        if isinstance(texts, list):
            return [str(item) for item in texts if str(item).strip()]
        if isinstance(texts, str) and texts.strip():
            return [texts]
    return []


def infer_category(question: str, row_id: str) -> str:
    haystack = f"{question} {row_id}".lower().replace("_", " ").replace("-", " ")
    normalized_labels = {normalize_label(label): label for label in CUAD_LABELS}

    for needle, label in normalized_labels.items():
        if needle in normalize_label(haystack):
            return label

    aliases = {
        "non compete": "Non-Compete",
        "non solicitation of customers": "No-Solicit of Customers",
        "non solicitation of employees": "No-Solicit of Employees",
        "anti assignment": "Anti-Assignment",
        "ip ownership": "IP Ownership Assignment",
        "irrevocable": "Irrevocable or Perpetual License",
        "perpetual": "Irrevocable or Perpetual License",
        "all you can eat": "Unlimited/All-You-Can-Eat License",
        "uncapped": "Uncapped Liability",
        "liability cap": "Cap on Liability",
    }
    normalized = normalize_label(haystack)
    for alias, label in aliases.items():
        if alias in normalized:
            return label

    return "Unknown"


def normalize_label(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", value.lower()).strip()


if __name__ == "__main__":
    main()
