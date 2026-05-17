import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function getGoogleAccessToken(projectId, productName = "Google Cloud") {
  if (process.env.GOOGLE_OAUTH_ACCESS_TOKEN) {
    return process.env.GOOGLE_OAUTH_ACCESS_TOKEN;
  }

  if (process.env.GCP_ACCESS_TOKEN) {
    return process.env.GCP_ACCESS_TOKEN;
  }

  const metadataToken = await getMetadataToken();
  if (metadataToken) {
    return metadataToken;
  }

  try {
    const { stdout } = await execFileAsync("gcloud", ["auth", "print-access-token"], {
      timeout: 8000,
      env: {
        ...process.env,
        CLOUDSDK_CORE_PROJECT: projectId,
        CLOUDSDK_CONFIG: process.env.CLOUDSDK_CONFIG || ".gcloud"
      }
    });
    const token = stdout.trim();
    if (token) {
      return token;
    }
  } catch {
    throw new Error(`No ${productName} access token found. Run \`gcloud auth application-default login\`, set GOOGLE_OAUTH_ACCESS_TOKEN, or deploy on Cloud Run with a service account.`);
  }

  throw new Error(`No ${productName} access token found.`);
}

async function getMetadataToken() {
  if (!process.env.K_SERVICE && !process.env.GCE_METADATA_HOST) {
    return null;
  }

  try {
    const response = await fetch("http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token", {
      headers: { "Metadata-Flavor": "Google" }
    });
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    return data.access_token || null;
  } catch {
    return null;
  }
}
