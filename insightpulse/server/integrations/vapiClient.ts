export interface VapiClientOptions {
  apiKey: string;
  baseUrl?: string;
}

export class VapiClient {
  apiKey: string;
  baseUrl: string;

  constructor(opts: VapiClientOptions) {
    // Accept both legacy and new env names
    this.apiKey =
      opts.apiKey ||
      process.env.VAPI_KEY ||
      process.env.VAPI_PRIVATE_API_KEY ||
      '';
    this.baseUrl =
      opts.baseUrl ||
      process.env.VAPI_URL_BASE ||
      process.env.VAPI_BASE_URL ||
      'https://api.vapi.ai';
  }

  async startCall(payload: any): Promise<any> {
    // If no API key is configured, return a mocked response
    if (!this.apiKey) {
      
      return Promise.resolve({ id: `mock-${Date.now()}`, status: 'mock', payload });
    }

    const url = `${this.baseUrl}/call`;

    // Use global fetch (Node 18+)
    const fetchFn = (globalThis as any).fetch;
    if (typeof fetchFn !== 'function') {
      throw new Error('Global fetch is not available. Please run on Node 18+');
    }

    const res = await fetchFn(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Vapi API error ${res.status}: ${text}`);
    }

    return res.json();
  }

  async importTwilioNumber(opts: {
    number: string;
    twilioAccountSid: string;
    twilioAuthToken: string;
    assistantId?: string;
    name?: string;
  }): Promise<any> {
    console.log('[VAPI] importTwilioNumber →', { number: opts.number, hasKey: !!this.apiKey, assistantId: opts.assistantId || null });

    if (!this.apiKey) {
      console.warn('[VAPI] No VAPI_KEY set — returning mock phoneNumberId (real import skipped)');
      return Promise.resolve({ id: `mock-pn-${Date.now()}`, status: 'mock', provider: 'twilio', number: opts.number });
    }

    const fetchFn = (globalThis as any).fetch;
    if (typeof fetchFn !== 'function') {
      throw new Error('Global fetch is not available. Please run on Node 18+');
    }

    const body: Record<string, any> = {
      provider: 'twilio',
      number: opts.number,
      twilioAccountSid: opts.twilioAccountSid,
      twilioAuthToken: opts.twilioAuthToken,
    };
    if (opts.assistantId) body.assistantId = opts.assistantId;
    if (opts.name) body.name = opts.name;

    const res = await fetchFn(`${this.baseUrl}/phone-number`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`[VAPI] phone-number import failed ${res.status}: ${text}`);
      throw new Error(`Vapi phone-number import error ${res.status}: ${text}`);
    }

    const data = await res.json();
    console.log('[VAPI] importTwilioNumber success →', { id: data?.id, number: data?.number });
    return data;
  }

  async deletePhoneNumber(phoneNumberId: string): Promise<void> {
    if (!this.apiKey) return;
    const fetchFn = (globalThis as any).fetch;
    if (typeof fetchFn !== 'function') return;
    await fetchFn(`${this.baseUrl}/phone-number/${phoneNumberId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
  }
}

export default VapiClient;
