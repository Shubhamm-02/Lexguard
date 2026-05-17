import { getGoogleAccessToken } from "./googleAuth.js";

export async function enhanceWithGemini({ text, localReport, persona, projectId, location, model }) {
  const token = await getGoogleAccessToken(projectId, "Vertex AI");
  const endpoint = buildVertexEndpoint({ projectId, location, model });
  const prompt = buildPrompt({ text, localReport, persona });

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        temperature: 0.2,
        topP: 0.9,
        maxOutputTokens: 1600
      }
    })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = payload?.error?.message || response.statusText;
    throw new Error(`Vertex AI returned ${response.status}: ${detail}`);
  }

  const rawText = payload?.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("\n").trim();
  if (!rawText) {
    throw new Error("Vertex AI returned an empty review.");
  }

  return parseJsonFromModel(rawText);
}

export function buildVertexEndpoint({ projectId, location, model }) {
  const host = location === "global" ? "https://aiplatform.googleapis.com" : `https://${location}-aiplatform.googleapis.com`;
  const resource = `projects/${projectId}/locations/${location}/publishers/google/models/${model}`;
  return `${host}/v1/${resource}:generateContent`;
}

function buildPrompt({ text, localReport, persona }) {
  const condensedFindings = localReport.findings.slice(0, 8).map((finding) => ({
    title: finding.title,
    severity: finding.severity,
    category: finding.category,
    evidence: finding.evidence,
    negotiationAsk: finding.negotiationAsk
  }));

  return `
You are LexGuard's legal risk review layer for a hackathon prototype. You do not provide legal advice. You explain risk awareness in practical language.

Affected user persona: ${persona}
Local risk engine summary:
${JSON.stringify({
    riskScore: localReport.metrics.riskScore,
    riskLevel: localReport.metrics.riskLevel,
    detectedType: localReport.meta.detectedType,
    topFindings: condensedFindings
  }, null, 2)}

Contract excerpt:
"""${text.slice(0, 14000)}"""

Return ONLY strict JSON with this shape:
{
  "executiveTake": "3-4 sentence practical interpretation",
  "missedRisks": [{"title": "...", "whyItMatters": "...", "evidence": "...", "severity": "Low|Medium|High|Critical"}],
  "crossClauseReasoning": [{"observation": "...", "implication": "..."}],
  "negotiationPriorities": [{"priority": "...", "ask": "...", "fallback": "..."}],
  "judgeDemoLine": "one sentence that explains why this analysis is more than summarization"
}
`;
}

function parseJsonFromModel(rawText) {
  const fenced = rawText.match(/```json\s*([\s\S]*?)```/i);
  const jsonText = fenced ? fenced[1] : rawText.slice(rawText.indexOf("{"), rawText.lastIndexOf("}") + 1);
  try {
    return JSON.parse(jsonText);
  } catch {
    return {
      executiveTake: rawText,
      missedRisks: [],
      crossClauseReasoning: [],
      negotiationPriorities: [],
      judgeDemoLine: "Gemini produced a narrative review, but not strict JSON."
    };
  }
}
