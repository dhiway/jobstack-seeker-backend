type TwilioResponse = {
  sid: string;
  status: string;
  error_code: number | null;
  error_message: string | null;
};

/**
 * Sends a WhatsApp message via Twilio API.
 *
 * @param to - The recipient WhatsApp number.
 *   - Must start with `"whatsapp:"` followed by the E.164 formatted phone number.
 *   - Example: `"whatsapp:+919876543210"`.
 *
 * @param contentSid - contentSid for the template to be used.
 *
 * @throws Will throw an error if the Twilio API request fails or returns an error_code.
 *
 * @example
 * ```ts
 * await sendWhatsAppMessage("whatsapp:+15005550006", "HXXXXXXXXXXXXX");
 * ```
 */

export async function sendWhatsAppMessage(
  to: string,
  contentSid: string
): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID!;
  const authToken = process.env.TWILIO_AUTH_TOKEN!;
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID!;
  const from = process.env.TWILIO_WHATSAPP_NUMBER!; // Twilio sandbox number or your approved number

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

  const params = new URLSearchParams();
  params.append('From', from);
  params.append('To', 'whatsapp:' + to);
  params.append('ContentSid', contentSid);
  params.append('MessagingServiceSid', messagingServiceSid);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization:
        'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Twilio API call failed: ${response.status} - ${errText}`);
  }

  const data: TwilioResponse = await response.json();

  if (data.error_code) {
    switch (data.error_code) {
      case 63016:
        console.error('Error 63016: Outside 24h window, need template.');
        break;
      case 63049:
        console.error('Error 63049: Marketing message blocked by Meta.');
        break;
      default:
        console.error(
          `Twilio returned error ${data.error_code}: ${data.error_message}`
        );
    }
  } else {
    console.log(
      `Message queued successfully (SID: ${data.sid}, Status: ${data.status})`
    );
  }
}
