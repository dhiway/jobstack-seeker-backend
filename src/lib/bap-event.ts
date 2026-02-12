
type BapEventResponse = {
  status?: string;
  event_id?: string;
  stream: string;
  created_at: string;
};



/**
 * Sends an event to BAP Event API.
 *
 * @param eventType - Type of the event (e.g., "profile.updated")
 * @param payload - JSON payload for the event
 *
 * @throws Will throw if API call fails
 *
 * @example
 * await sendBapEvent("profile.updated", { id: "123" });
 */
export async function sendBapEvent(
  eventType: string,
  payload: Record<string, any>
): Promise<void> {

  const baseUrl = process.env.BAP_ONEST_LITE_BASE_URL!;
  const apiKey = process.env.BAP_X_API_KEY!;

  const url = `${baseUrl}/api/v1/event`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      event_type: eventType,
      payload,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(
      `BAP Event API failed: ${response.status} - ${errText}`
    );
  }

  const data: BapEventResponse = await response.json();

  if (data.error) {
    throw new Error(`BAP returned error: ${data.error}`);
  }

  console.log(
    `Event sent successfully (type: ${eventType})`
  );
}
