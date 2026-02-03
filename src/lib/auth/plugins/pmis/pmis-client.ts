import { PMISPluginOptions, PMISUser } from './types';

export class PMISClient {
  constructor(private options: PMISPluginOptions) {}

  async exchangeCode(code: string) {
    const res = await fetch(this.options.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: this.options.clientId,
        client_secret: this.options.clientSecret,
        authorization_code: code,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`PMIS token exchange failed: ${text}`);
    }

    return res.json() as Promise<{
      access_token: string;
      expires_at: number;
    }>;
  }

  async getUser(accessToken: string) {
    const res = await fetch(this.options.userInfoUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      throw new Error('Failed to fetch PMIS user');
    }

    return res.json() as Promise<PMISUser>;
  }
}
