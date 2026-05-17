import { readFile } from "node:fs/promises";
import { analyzeContract } from "../public/analyzer.js";
import { cuadClauseTaxonomy } from "../public/cuadTaxonomy.js";

const expectedRiskTitles = [
  "Restrictive Non-Compete",
  "Outside Work Approval Gate",
  "Broad IP Assignment",
  "Perpetual Sublicensable License",
  "One-Sided Indemnity",
  "Uncapped Liability Carveouts",
  "Hidden Auto-Renewal Burden",
  "No Refund Escape Hatch",
  "Excessive Data Sharing",
  "Unilateral Change Power",
  "Arbitration and Class Waiver",
  "Forum Advantage",
  "Asymmetric Termination Rights",
  "Open-Ended Audit Burden",
  "Indefinite Confidentiality",
  "Payment Subject to Sole Acceptance",
  "Catch-All Compliance Obligation",
  "Liability Stack Asymmetry",
  "Silent Acceptance of Future Changes",
  "Renewal Lock-In With No Refund"
];

const expectedCuadCategoryIds = cuadClauseTaxonomy.map((category) => category.id);

let failureCount = 0;

console.log("LEXGUARD sample coverage check");

await checkCoverageSample();
await checkFocusedSample({
  file: "../samples/freelance-founder-red-flags.txt",
  persona: "founder",
  expectedTitles: [
    "Broad IP Assignment",
    "Perpetual Sublicensable License",
    "Payment Subject to Sole Acceptance",
    "Asymmetric Termination Rights",
    "One-Sided Indemnity",
    "Indefinite Confidentiality"
  ]
});
await checkFocusedSample({
  file: "../samples/vendor-msa-red-flags.txt",
  persona: "vendor",
  expectedTitles: [
    "Catch-All Compliance Obligation",
    "Open-Ended Audit Burden",
    "Uncapped Liability Carveouts",
    "Liability Stack Asymmetry",
    "One-Sided Indemnity",
    "Asymmetric Termination Rights",
    "Broad IP Assignment"
  ]
});
await checkQuietSamples();

if (failureCount) {
  process.exit(1);
}

console.log("All expected sample categories are detected.");

async function checkCoverageSample() {
  const sample = new URL("../samples/category-coverage-contract.txt", import.meta.url);
  const report = await analyzeSample(sample, "individual");
  const detectedRiskTitles = new Set(report.findings.map((finding) => finding.title));
  const detectedCuadCategoryIds = new Set(report.cuadReview.detectedLabels.map((label) => label.categoryId));

  const missingRiskTitles = expectedRiskTitles.filter((title) => !detectedRiskTitles.has(title));
  const missingCuadCategoryIds = expectedCuadCategoryIds.filter((id) => !detectedCuadCategoryIds.has(id));

  console.log(`Coverage sample: ${sample.pathname}`);
  console.log(`  Risk score: ${report.metrics.riskScore}/100 ${report.metrics.riskLevel}`);
  console.log(`  Practical risks detected: ${detectedRiskTitles.size}/${expectedRiskTitles.length}`);
  console.log(`  CUAD categories detected: ${detectedCuadCategoryIds.size}/${expectedCuadCategoryIds.length}`);
  console.log(`  Clause count: ${report.meta.clauseCount}`);
  console.log(`  Top findings: ${report.findings.slice(0, 5).map((finding) => finding.title).join(", ")}`);

  if (missingRiskTitles.length) {
    failureCount += 1;
    console.error(`  Missing practical risks: ${missingRiskTitles.join(", ")}`);
  }

  if (missingCuadCategoryIds.length) {
    failureCount += 1;
    console.error(`  Missing CUAD categories: ${missingCuadCategoryIds.join(", ")}`);
  }
}

async function checkFocusedSample({ file, persona, expectedTitles }) {
  const sample = new URL(file, import.meta.url);
  const report = await analyzeSample(sample, persona);
  const detectedTitles = new Set(report.findings.map((finding) => finding.title));
  const missingTitles = expectedTitles.filter((title) => !detectedTitles.has(title));

  console.log(`Focused sample: ${sample.pathname}`);
  console.log(`  Persona: ${persona}`);
  console.log(`  Risk score: ${report.metrics.riskScore}/100 ${report.metrics.riskLevel}`);
  console.log(`  Expected findings detected: ${expectedTitles.length - missingTitles.length}/${expectedTitles.length}`);
  console.log(`  Top findings: ${report.findings.slice(0, 4).map((finding) => finding.title).join(", ")}`);

  if (missingTitles.length) {
    failureCount += 1;
    console.error(`  Missing findings: ${missingTitles.join(", ")}`);
  }
}

async function checkQuietSamples() {
  const samples = [
    { file: "../samples/balanced-services-agreement.txt", persona: "founder" },
    { file: "../samples/no-risk-employment-offer.txt", persona: "employee" },
    { file: "../samples/no-risk-subscription-terms.txt", persona: "consumer" },
    { file: "../samples/no-risk-vendor-mutual-msa.txt", persona: "vendor" }
  ];

  for (const item of samples) {
    const sample = new URL(item.file, import.meta.url);
    const report = await analyzeSample(sample, item.persona);
    const isQuiet = report.metrics.riskScore <= 25 && report.findings.length === 0;

    console.log(`Quiet sample: ${sample.pathname}`);
    console.log(`  Persona: ${item.persona}`);
    console.log(`  Risk score: ${report.metrics.riskScore}/100 ${report.metrics.riskLevel}`);
    console.log(`  Findings: ${report.findings.length}`);

    if (!isQuiet) {
      failureCount += 1;
      console.error("  Expected a quiet low-risk output.");
      console.error(`  Detected: ${report.findings.map((finding) => finding.title).join(", ") || "none"}`);
    }
  }
}

async function analyzeSample(sample, persona) {
  const text = await readFile(sample, "utf8");
  return analyzeContract(text, {
    documentName: sample.pathname.split("/").pop(),
    contractType: "auto",
    persona
  });
}
