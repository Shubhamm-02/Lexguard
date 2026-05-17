import { getGoogleAccessToken } from "./googleAuth.js";

const supportedMimeTypes = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/tiff",
  "image/gif",
  "image/bmp",
  "image/webp"
]);

export async function extractTextWithDocumentAI({
  contentBase64,
  mimeType,
  projectId,
  location,
  processorId,
  timeoutMs = 20000
}) {
  if (!processorId) {
    throw new Error("DOCUMENT_AI_PROCESSOR_ID is not configured.");
  }

  if (!supportedMimeTypes.has(mimeType)) {
    throw new Error(`Unsupported Document AI file type: ${mimeType}`);
  }

  const token = await getGoogleAccessToken(projectId, "Document AI");
  const endpoint = `https://${location}-documentai.googleapis.com/v1/projects/${projectId}/locations/${location}/processors/${processorId}:process`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        rawDocument: {
          content: contentBase64,
          mimeType
        },
        processOptions: {
          ocrConfig: {
            enableNativePdfParsing: true,
            enableImageQualityScores: true
          }
        }
      }),
      signal: controller.signal
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = payload?.error?.message || response.statusText;
      throw new Error(`Document AI returned ${response.status}: ${detail}`);
    }

    const text = String(payload?.document?.text || "").trim();
    if (!text) {
      throw new Error("Document AI did not return readable text.");
    }

    return {
      text,
      pageCount: payload?.document?.pages?.length || null,
      mimeType
    };
  } finally {
    clearTimeout(timer);
  }
}
