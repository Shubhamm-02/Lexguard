import http from "node:http";
import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeContract } from "./public/analyzer.js";
import { logAnalysisEvent } from "./src/bigquery.js";
import { extractTextWithDocumentAI } from "./src/documentai.js";
import { enhanceWithGemini } from "./src/gemini.js";
import { answerContractQuestion, enhanceWithOpenAI, hasOpenAIKey } from "./src/openai.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "public");
const defaultProject = "";

loadDotEnv(path.join(__dirname, ".env"));

const config = {
  projectId: process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || defaultProject,
  location: process.env.VERTEX_LOCATION || "global",
  model: process.env.VERTEX_MODEL || "gemini-2.5-flash",
  openAIModel: process.env.OPENAI_MODEL || "gpt-5.5",
  openAIReasoningEffort: process.env.OPENAI_REASONING_EFFORT || "low",
  openAITimeoutMs: Number(process.env.OPENAI_TIMEOUT_MS || 12000),
  openAIChatTimeoutMs: Number(process.env.OPENAI_CHAT_TIMEOUT_MS || 10000),
  documentAILocation: process.env.DOCUMENT_AI_LOCATION || "us",
  documentAIProcessorId: process.env.DOCUMENT_AI_PROCESSOR_ID || "",
  documentAITimeoutMs: Number(process.env.DOCUMENT_AI_TIMEOUT_MS || 20000),
  maxUploadBytes: Number(process.env.MAX_UPLOAD_BYTES || 8_000_000),
  aiProvider: process.env.AI_PROVIDER || (process.env.OPENAI_API_KEY ? "openai" : "local"),
  googleTelemetryEnabled: process.env.GOOGLE_TELEMETRY_ENABLED === "true",
  bigQueryDataset: process.env.BIGQUERY_DATASET || "",
  bigQueryTable: process.env.BIGQUERY_TABLE || "analysis_events",
  port: Number(process.env.PORT || 8080),
  host: process.env.HOST || (process.env.K_SERVICE ? "0.0.0.0" : "127.0.0.1")
};

const staticAssetCache = new Map();

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8"
};
const allowedExtractMimeTypes = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/tiff"
]);

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

    if (req.method === "GET" && url.pathname === "/health") {
      return sendJson(res, 200, { ok: true, service: "lexguard" });
    }

    if (req.method === "GET" && url.pathname === "/api/config") {
      return sendJson(res, 200, publicConfig());
    }

    if (req.method === "POST" && url.pathname === "/api/extract") {
      const body = await readBody(req);
      const payload = parsePayload(body, req.headers["content-type"] || "");
      const contentBase64 = String(payload.contentBase64 || "");
      const mimeType = String(payload.mimeType || "");
      const fileName = String(payload.fileName || "Uploaded document");

      if (!contentBase64 || !mimeType) {
        return sendJson(res, 400, { error: "File content and MIME type are required." });
      }
      if (!allowedExtractMimeTypes.has(mimeType)) {
        return sendJson(res, 415, { error: "Only PDF, PNG, JPEG, and TIFF extraction is supported." });
      }

      const extracted = await extractTextWithDocumentAI({
        contentBase64,
        mimeType,
        projectId: config.projectId,
        location: config.documentAILocation,
        processorId: config.documentAIProcessorId,
        timeoutMs: config.documentAITimeoutMs
      });

      return sendJson(res, 200, {
        ...extracted,
        fileName,
        engine: {
          provider: "Google Document AI OCR",
          location: config.documentAILocation
        }
      });
    }

    if (req.method === "POST" && url.pathname === "/api/analyze") {
      const body = await readBody(req);
      const payload = parsePayload(body, req.headers["content-type"] || "");
      const text = String(payload.text || "").trim();

      if (text.length < 40) {
        return sendJson(res, 400, {
          error: "Please provide a contract or policy excerpt with at least 40 characters."
        });
      }

      const localReport = analyzeContract(text, {
        persona: payload.persona,
        contractType: payload.contractType,
        documentName: payload.documentName
      });
      queueAnalysisTelemetry(localReport, config.aiProvider.toLowerCase(), text);

      if (config.aiProvider.toLowerCase() === "openai") {
        const enhanced = await withOpenAISafety(localReport, text, payload);
        return sendJson(res, 200, enhanced);
      }

      if (config.aiProvider.toLowerCase() === "vertex") {
        const enhanced = await withGeminiSafety(localReport, text, payload);
        return sendJson(res, 200, enhanced);
      }

      return sendJson(res, 200, {
        ...localReport,
        engine: {
          mode: "local",
          provider: "Deterministic legal risk engine",
          note: "Set AI_PROVIDER=openai with OPENAI_API_KEY to add a GPT-5.5 reasoning layer."
        }
      });
    }

    if (req.method === "POST" && url.pathname === "/api/chat") {
      const body = await readBody(req);
      const payload = parsePayload(body, req.headers["content-type"] || "");
      const message = String(payload.message || "").trim();

      if (!message) {
        return sendJson(res, 400, { error: "Message is required." });
      }
      if (message.length > 1200) {
        return sendJson(res, 400, { error: "Keep Ask AI questions under 1,200 characters." });
      }

      if (!payload.report) {
        return sendJson(res, 200, {
          mode: "restricted",
          answer: "Ask AI is available after a contract report is generated. Analyze a contract first so I can answer from the detected clauses."
        });
      }

      if (!isRelevantContractQuestion(message, payload.report)) {
        return sendJson(res, 200, {
          mode: "restricted",
          answer: "I can only answer questions about this contract, its clauses, risks, scenarios, legal categories, or negotiation strategy."
        });
      }

      if (!hasOpenAIKey()) {
        return sendJson(res, 200, {
          mode: "local",
          answer: localChatAnswer(message, payload.report)
        });
      }

      try {
        const answer = await answerContractQuestion({
          message,
          report: payload.report,
          model: config.openAIModel,
          reasoningEffort: normalizeReasoningEffort(config.openAIReasoningEffort),
          timeoutMs: config.openAIChatTimeoutMs
        });
        return sendJson(res, 200, {
          mode: "openai",
          model: config.openAIModel,
          answer
        });
      } catch (error) {
        return sendJson(res, 200, {
          mode: "local-fallback",
          warning: publicErrorMessage(error),
          answer: localChatAnswer(message, payload.report)
        });
      }
    }

    if (req.method === "GET") {
      return serveStatic(req, url.pathname, res);
    }

    return sendJson(res, 405, { error: "Method not allowed" });
  } catch (error) {
    const status = Number(error.statusCode || error.status || 500);
    if (status >= 500) {
      console.error(error);
    }
    return sendJson(res, status, {
      error: status >= 500 ? "Unexpected server error" : publicErrorMessage(error)
    });
  }
});

server.listen(config.port, config.host, () => {
  const localUrl = config.host === "0.0.0.0" ? `http://localhost:${config.port}` : `http://${config.host}:${config.port}`;
  console.log(`LEXGUARD running at ${localUrl}`);
  console.log(`AI provider: ${config.aiProvider} | Document AI: ${config.documentAIProcessorId ? "enabled" : "disabled"}`);
});

async function withGeminiSafety(localReport, text, payload) {
  try {
    const aiReview = await enhanceWithGemini({
      text,
      localReport,
      persona: payload.persona || "individual",
      projectId: config.projectId,
      location: config.location,
      model: config.model
    });

    return {
      ...localReport,
      aiReview,
      engine: {
        mode: "hybrid",
        provider: "Local risk engine + Vertex AI Gemini review",
        location: config.location,
        model: config.model
      }
    };
  } catch (error) {
    return {
      ...localReport,
      engine: {
        mode: "local-fallback",
        provider: "Deterministic legal risk engine",
        warning: `Vertex AI review was skipped: ${publicErrorMessage(error)}`
      }
    };
  }
}

async function withOpenAISafety(localReport, text, payload) {
  try {
    const aiReview = await enhanceWithOpenAI({
      text,
      localReport,
      persona: payload.persona || "individual",
      model: config.openAIModel,
      reasoningEffort: normalizeReasoningEffort(config.openAIReasoningEffort),
      timeoutMs: config.openAITimeoutMs
    });

    return {
      ...localReport,
      aiReview,
      engine: {
        mode: "hybrid",
        provider: "Local risk engine + OpenAI GPT reasoning review",
        model: config.openAIModel,
        reasoningEffort: config.openAIReasoningEffort
      }
    };
  } catch (error) {
    return {
      ...localReport,
      engine: {
        mode: "local-fallback",
        provider: "Deterministic legal risk engine",
        model: config.openAIModel,
        warning: `OpenAI review was skipped: ${publicErrorMessage(error)}`
      }
    };
  }
}

function normalizeReasoningEffort(value) {
  if (value === "xhigh") return "high";
  if (["none", "minimal", "low", "medium", "high"].includes(value)) return value;
  return "low";
}

function localChatAnswer(message, report) {
  const topFinding = report?.findings?.[0];
  if (!topFinding) {
    return "Analyze a contract first, then I can answer using the detected clauses and negotiation plan.";
  }

  return `Based on the current report, the main issue is ${topFinding.title} in ${topFinding.clauseId}. ${topFinding.explanation} Practical impact: ${topFinding.realWorldImpact} A reasonable ask is: ${topFinding.negotiationAsk}`;
}

function queueAnalysisTelemetry(report, engineMode, sourceText) {
  if (!config.googleTelemetryEnabled || !config.projectId || !config.bigQueryDataset) {
    return;
  }

  const highRiskFindings = (report.findings || []).filter((finding) => finding.severity === "high").length;
  const event = {
    event_id: randomUUID(),
    created_at: new Date().toISOString(),
    document_type: String(report.meta?.detectedType || "unknown"),
    persona: String(report.meta?.persona || "unknown"),
    risk_score: Number(report.metrics?.score || 0),
    risk_level: String(report.metrics?.level || "unknown"),
    total_findings: Number(report.findings?.length || 0),
    high_risk_findings: highRiskFindings,
    cuad_detected: Number(report.cuad?.detected?.length || 0),
    cuad_total: Number(report.cuad?.total || 41),
    top_category: String(report.metrics?.topCategory || "none"),
    engine_mode: String(engineMode || "local"),
    word_count: String(sourceText || "").trim().split(/\s+/).filter(Boolean).length,
    clause_count: Number(report.clauses?.length || 0)
  };

  logAnalysisEvent({
    projectId: config.projectId,
    datasetId: config.bigQueryDataset,
    tableId: config.bigQueryTable,
    event
  }).catch((error) => {
    console.warn(`BigQuery telemetry skipped: ${publicErrorMessage(error)}`);
  });
}

function isRelevantContractQuestion(message, report) {
  const lower = String(message || "").toLowerCase();
  const relevantTerms = [
    "contract", "agreement", "clause", "risk", "risky", "legal", "liability", "indemnity",
    "termination", "renewal", "privacy", "data", "arbitration", "dispute", "ip", "intellectual",
    "ownership", "payment", "refund", "audit", "compliance", "negotiate", "negotiation",
    "non-compete", "non compete", "confidential", "scenario", "impact", "sign", "accept",
    "safe", "unsafe", "explain", "summary", "obligation", "vendor", "employee", "consumer",
    "freelancer", "founder"
  ];

  if (relevantTerms.some((term) => messageContainsTerm(lower, term))) {
    return true;
  }

  const reportTerms = [
    ...(report?.findings || []).flatMap((finding) => [finding.title, finding.category, finding.clauseId]),
    report?.metrics?.topCategory,
    report?.meta?.detectedType
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .split(/[^a-z0-9-]+/)
    .filter((term) => term.length > 4);

  return reportTerms.some((term) => lower.includes(term));
}

function messageContainsTerm(message, term) {
  const normalized = String(term || "").toLowerCase();
  if (/^[a-z0-9-]{1,3}$/.test(normalized)) {
    return new RegExp(`(^|[^a-z0-9])${escapeRegExp(normalized)}([^a-z0-9]|$)`).test(message);
  }
  return message.includes(normalized);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function serveStatic(req, requestPath, res) {
  let cleanPath = "";
  try {
    cleanPath = decodeURIComponent(requestPath.split("?")[0]);
  } catch {
    throw httpError(400, "Invalid URL path.");
  }
  const requested = cleanPath === "/" ? "/index.html" : cleanPath;
  const filePath = path.normalize(path.join(publicDir, requested));
  const publicRoot = publicDir.endsWith(path.sep) ? publicDir : `${publicDir}${path.sep}`;

  if ((!filePath.startsWith(publicRoot) && filePath !== publicDir) || !existsSync(filePath)) {
    return sendJson(res, 404, { error: "Not found" });
  }

  const extension = path.extname(filePath);
  const asset = await getStaticAsset(filePath, extension);
  const headers = {
    ...securityHeaders(),
    "content-type": asset.contentType,
    "cache-control": cacheControlFor(extension),
    etag: asset.etag
  };

  if (req.headers["if-none-match"] === asset.etag) {
    res.writeHead(304, headers);
    res.end();
    return;
  }

  res.writeHead(200, headers);
  res.end(asset.data);
}

async function getStaticAsset(filePath, extension) {
  const cached = staticAssetCache.get(filePath);
  if (cached) {
    return cached;
  }

  const data = await readFile(filePath);
  const asset = {
    data,
    contentType: mimeTypes[extension] || "application/octet-stream",
    etag: `"${createHash("sha256").update(data).digest("hex").slice(0, 24)}"`
  };
  staticAssetCache.set(filePath, asset);
  return asset;
}

function cacheControlFor(extension) {
  if (extension === ".html") {
    return "no-store";
  }

  if ([".js", ".css", ".png", ".svg", ".json", ".txt"].includes(extension)) {
    return "public, max-age=600, stale-while-revalidate=86400";
  }

  return "no-store";
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > config.maxUploadBytes) {
      throw httpError(413, `Payload too large. Keep uploads under ${Math.round(config.maxUploadBytes / 1_000_000)} MB.`);
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function parsePayload(body, contentType) {
  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(body || "{}");
    } catch {
      throw httpError(400, "Invalid JSON payload.");
    }
  }
  return { text: body };
}

function publicConfig() {
  return {
    aiProvider: config.aiProvider,
    location: config.location,
    model: config.model,
    openAIModel: config.openAIModel,
    openAIEnabled: hasOpenAIKey(),
    documentAIEnabled: Boolean(config.documentAIProcessorId),
    documentAILocation: config.documentAILocation
  };
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    ...securityHeaders(),
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  res.end(JSON.stringify(payload, null, 2));
}

function securityHeaders() {
  return {
    "content-security-policy": "default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; img-src 'self' data:; script-src 'self'; style-src 'self'; connect-src 'self'; object-src 'none'",
    "cross-origin-resource-policy": "same-origin",
    "permissions-policy": "camera=(), microphone=(), geolocation=(), payment=()",
    "referrer-policy": "no-referrer",
    "x-content-type-options": "nosniff"
  };
}

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function publicErrorMessage(error) {
  return String(error?.message || "Request failed.").replace(/sk-[a-zA-Z0-9_-]+/g, "[redacted]");
}

function loadDotEnv(envPath) {
  if (!existsSync(envPath)) {
    return;
  }

  const raw = readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }

    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    value = value.replace(/^["']|["']$/g, "");
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}
