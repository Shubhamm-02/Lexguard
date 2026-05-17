import { readFile, writeFile } from "node:fs/promises";
import { analyzeContract } from "../public/analyzer.js";

const inputPath = process.argv[2];
const outputPath = process.argv[3];

if (!inputPath) {
  console.error("Usage: npm run analyze:file -- <contract.txt> [report.json]");
  process.exit(1);
}

const text = await readFile(inputPath, "utf8");
const report = analyzeContract(text, {
  documentName: inputPath,
  contractType: "auto"
});

const serialized = JSON.stringify(report, null, 2);
if (outputPath) {
  await writeFile(outputPath, serialized);
} else {
  console.log(serialized);
}
