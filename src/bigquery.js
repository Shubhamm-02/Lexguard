import { getGoogleAccessToken } from "./googleAuth.js";

export async function logAnalysisEvent({ projectId, datasetId, tableId, event }) {
  if (!projectId || !datasetId || !tableId || !event) {
    return;
  }

  const token = await getGoogleAccessToken(projectId, "BigQuery");
  const endpoint = `https://bigquery.googleapis.com/bigquery/v2/projects/${encodeURIComponent(projectId)}/datasets/${encodeURIComponent(datasetId)}/tables/${encodeURIComponent(tableId)}/insertAll`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      kind: "bigquery#tableDataInsertAllRequest",
      skipInvalidRows: true,
      ignoreUnknownValues: true,
      rows: [
        {
          insertId: event.event_id,
          json: event
        }
      ]
    })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.insertErrors?.length) {
    const message = payload.error?.message || payload.insertErrors?.[0]?.errors?.[0]?.message || "BigQuery insert failed.";
    throw new Error(message);
  }
}
