export interface SendSmsOptions {
  phoneNumber: string;
  message: string;
  template_id?: string;
}

export async function sendSmsWithMsg91({
  phoneNumber,
  message,
  template_id,
}: SendSmsOptions) {
  const phone = phoneNumber.startsWith('+')
    ? phoneNumber.slice(1)
    : phoneNumber;
  const authKey = process.env.MSG91_AUTH_KEY!;
  const url = `https://control.msg91.com/api/v5/flow`;
  const body = JSON.stringify({
    template_id:
      typeof template_id === 'string'
        ? template_id
        : process.env.MSG91_TEMPLATE_ID,
    short_url: 0,
    recipients: [
      {
        mobiles: phone,
        var: message,
      },
    ],
  });

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      authkey: authKey,
    },
    body,
  });
  const response = await resp.text();
  console.info('sending sms to user: ', response);
  if (!resp.ok) {
    const errorText = await resp.text();
    throw new Error(`MSG91 SMS send failed: ${errorText}`);
  }

  return response;
}
