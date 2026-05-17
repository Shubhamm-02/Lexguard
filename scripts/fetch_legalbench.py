#!/usr/bin/env python3
"""Fetch selected LegalBench configs from Hugging Face.

Usage:
  python3 -m pip install -r requirements-cuad.txt
  python3 scripts/fetch_legalbench.py

The export is intentionally compact and benchmark-oriented. It writes JSONL rows
and stats to data/legalbench/ so LEXGUARD can show LegalBench-backed evaluation
without mixing these tasks into the main contract review UI.
"""

from __future__ import annotations

import argparse
import json
import re
from collections import Counter
from pathlib import Path
from typing import Any


DEFAULT_DATASET = "nguha/legalbench"
DEFAULT_CONFIGS = ["citation_prediction_classification", "abercrombie"]


TASK_NOTES = {
    "citation_prediction_classification": {
        "product_use": "future citation support checking",
        "why_it_matters": "Tests whether a model can decide if a citation supports a legal statement.",
    },
    "abercrombie": {
        "product_use": "future trademark and brand-risk expansion",
        "why_it_matters": "Tests classification of trademark distinctiveness for a mark/product pair.",
    },
}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", default=DEFAULT_DATASET)
    parser.add_argument("--configs", nargs="+", default=DEFAULT_CONFIGS)
    parser.add_argument("--out", default="data/legalbench")
    parser.add_argument("--max-rows", type=int, default=0, help="Optional per-config cap for quick smoke tests.")
    args = parser.parse_args()

    try:
        from datasets import load_dataset
    except ImportError as exc:
        raise SystemExit(
            "Missing dependency: install with `python3 -m pip install -r requirements-cuad.txt`."
        ) from exc

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    all_stats: dict[str, Any] = {
        "dataset": args.dataset,
        "configs": {},
        "outputs": {},
    }

    for config_name in args.configs:
        dataset = load_dataset(args.dataset, config_name)
        stats = export_config(config_name, dataset, out_dir, args.max_rows)
        all_stats["configs"][config_name] = stats
        all_stats["outputs"][config_name] = stats["output"]

    (out_dir / "stats.json").write_text(json.dumps(all_stats, indent=2, ensure_ascii=False), encoding="utf-8")
    write_readme(out_dir, args.dataset, args.configs)
    print(json.dumps(all_stats, indent=2, ensure_ascii=False))


def export_config(config_name: str, dataset: Any, out_dir: Path, max_rows: int) -> dict[str, Any]:
    output_path = out_dir / f"{config_name}.jsonl"
    split_counts: Counter[str] = Counter()
    label_counts: Counter[str] = Counter()
    rows_written = 0

    with output_path.open("w", encoding="utf-8") as output_file:
        for split_name, split in dataset.items():
            for index, row in enumerate(split):
                normalized = normalize_row(config_name, split_name, index, dict(row))
                output_file.write(json.dumps(normalized, ensure_ascii=False) + "\n")
                split_counts[split_name] += 1
                label_counts[str(normalized.get("label") or "unknown")] += 1
                rows_written += 1

                if max_rows and rows_written >= max_rows:
                    break
            if max_rows and rows_written >= max_rows:
                break

    return {
        "config": config_name,
        "rows": rows_written,
        "split_counts": dict(split_counts),
        "label_counts": dict(label_counts.most_common()),
        "task_note": TASK_NOTES.get(config_name, {}),
        "output": str(output_path),
    }


def normalize_row(config_name: str, split_name: str, index: int, row: dict[str, Any]) -> dict[str, Any]:
    label = first_present(row, ["answer", "label", "target", "gold", "classification", "class"])
    input_text = first_present(row, ["text", "input", "prompt", "question", "statement", "query"])
    choices = first_present(row, ["choices", "options"])

    return {
        "id": str(first_present(row, ["id", "example_id", "idx"]) or f"{config_name}:{split_name}:{index}"),
        "task": config_name,
        "split": split_name,
        "input": coerce_text(input_text),
        "label": coerce_text(label),
        "choices": normalize_choices(choices),
        "fields": normalize_fields(row),
    }


def first_present(row: dict[str, Any], keys: list[str]) -> Any:
    for key in keys:
        if key in row and row[key] not in (None, ""):
            return row[key]
    return None


def normalize_choices(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return [coerce_text(item) for item in value if coerce_text(item)]
    return [coerce_text(value)] if coerce_text(value) else []


def normalize_fields(row: dict[str, Any]) -> dict[str, Any]:
    normalized = {}
    for key, value in row.items():
        if isinstance(value, (str, int, float, bool)) or value is None:
            normalized[key] = value
        elif isinstance(value, list):
            normalized[key] = [coerce_text(item) for item in value]
        else:
            normalized[key] = coerce_text(value)
    return normalized


def coerce_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return re.sub(r"\s+", " ", value).strip()
    return re.sub(r"\s+", " ", json.dumps(value, ensure_ascii=False, default=str)).strip()


def write_readme(out_dir: Path, dataset_name: str, configs: list[str]) -> None:
    config_lines = "\n".join(f"- `{config}`: {TASK_NOTES.get(config, {}).get('product_use', 'benchmark task')}" for config in configs)
    (out_dir / "README.md").write_text(
        "# LegalBench Local Export\n\n"
        f"Generated from Hugging Face dataset `{dataset_name}`.\n\n"
        f"{config_lines}\n\n"
        "These tasks are evaluation assets for LEXGUARD. CUAD remains the core contract-review dataset; "
        "LegalBench is useful for demonstrating broader legal reasoning, citation support checks, and future IP/trademark expansion.\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
