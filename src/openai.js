const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";

const reviewSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    executiveTake: { type: "string" },
    missedRisks: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          whyItMatters: { type: "string" },
          evidence: { type: "string" },
          severity: { type: "string", enum: ["Low", "Medium", "High", "Critical"] }
        },
        required: ["title", "whyItMatters", "evidence", "severity"]
      }
    },
    crossClauseReasoning: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          observation: { type: "string" },
          implication: { type: "string" }
        },
        required: ["observation", "implication"]
      }
    },
    negotiationPriorities: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          priority: { type: "string" },
          ask: { type: "string" },
          fallback: { type: "string" }
        },
        required: ["priority", "ask", "fallback"]
      }
    },
    judgeDemoLine: { type: "string" }
  },
  required: ["executiveTake", "missedRisks", "crossClauseReasoning", "negotiationPriorities", "judgeDemoLine"]
};

export async function enhanceWithOpenAI({ text, localReport, persona, model, reasoningEffort, timeoutMs }) {
  const apiKey = getApiKey();
  const response = await fetchWithTimeout(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model,
      instructions: "You are LEXGUARD's senior contract-risk reviewer. You provide legal awareness, not legal advice. Be practical, evidence-grounded, and negotiation-oriented.",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: buildReviewPrompt({ text, localReport, persona })
            }
          ]
        }
      ],
      text: {
        verbosity: "low",
        format: {
          type: "json_schema",
          name: "lexguard_ai_review",
          strict: true,
          schema: reviewSchema
        }
      },
      reasoning: {
        effort: reasoningEffort || "low"
      },
      max_output_tokens: 1100
    })
  }, timeoutMs || 12000);

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = payload?.error?.message || response.statusText;
    throw new Error(`OpenAI returned ${response.status}: ${detail}`);
  }

  const rawText = extractOutputText(payload);
  if (!rawText) {
    throw new Error("OpenAI returned an empty review.");
  }

  return JSON.parse(rawText);
}

export async function answerContractQuestion({ message, report, model, reasoningEffort, timeoutMs }) {
  const apiKey = getApiKey();
  const selectedFinding = report?.findings?.[0] || null;
  const context = {
    role: report?.meta?.personaLabel || report?.meta?.persona,
    riskScore: report?.metrics?.riskScore,
    riskLevel: report?.metrics?.riskLevel,
    topFindings: (report?.findings || []).slice(0, 5).map((finding) => ({
      title: finding.title,
      clauseId: finding.clauseId,
      severity: finding.severity,
      evidence: finding.evidence,
      negotiationAsk: finding.negotiationAsk
    })),
    selectedFinding
  };

  const response = await fetchWithTimeout(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model,
      instructions: "You are LEXGUARD's contract assistant. Answer only questions about the current contract report, detected clauses, risks, scenarios, legal categories, or negotiation strategy. If the question is unrelated, politely refuse in one sentence. Do not give legal advice. Refer to clause evidence where useful.",
      input: `User question: ${message}\n\nCurrent LEXGUARD report context:\n${JSON.stringify(context, null, 2)}`,
      text: { verbosity: "low", format: { type: "text" } },
      reasoning: { effort: reasoningEffort || "low" },
      max_output_tokens: 650
    })
  }, timeoutMs || 10000);

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = payload?.error?.message || response.statusText;
    throw new Error(`OpenAI returned ${response.status}: ${detail}`);
  }

  return extractOutputText(payload) || "I could not generate an answer from the current report.";
}

export function hasOpenAIKey() {
  return Boolean(process.env.OPENAI_API_KEY);
}

function getApiKey() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }
  return process.env.OPENAI_API_KEY;
}

function buildReviewPrompt({ text, localReport, persona }) {
  const condensedFindings = localReport.findings.slice(0, 10).map((finding) => ({
    title: finding.title,
    severity: finding.severity,
    score: finding.score,
    category: finding.category,
    clauseId: finding.clauseId,
    evidence: finding.evidence,
    negotiationAsk: finding.negotiationAsk
  }));

  return `
Affected user persona: ${persona}

Local deterministic LEXGUARD report:
${JSON.stringify({
    riskScore: localReport.metrics.riskScore,
    riskLevel: localReport.metrics.riskLevel,
    detectedType: localReport.meta.detectedType,
    personaProfile: localReport.personaProfile,
    cuadReview: {
      detectedCategoryCount: localReport.cuadReview?.detectedCategoryCount,
      detectedLabels: localReport.cuadReview?.detectedLabels?.slice(0, 10)?.map((item) => item.category)
    },
    topFindings: condensedFindings
  }, null, 2)}

Contract excerpt:
"""${text.slice(0, 12000)}"""

Return a second-review JSON report. Focus on practical harm, cross-clause interactions, negotiation strategy, and anything the local engine may have missed.`;
}

function extractOutputText(payload) {
  if (payload.output_text) {
    return payload.output_text.trim();
  }

  const parts = [];
  for (const item of payload.output || []) {
    for (const content of item.content || []) {
      if (content.type === "output_text" && content.text) {
        parts.push(content.text);
      }
    }
  }
  return parts.join("\n").trim();
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal
    });
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error(`OpenAI request timed out after ${Math.round(timeoutMs / 1000)}s.`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
