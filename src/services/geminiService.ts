import { MarketInsight } from "../types";

// Client-side Gemini service proxies all requests through the backend server.
// This ensures that all users can use the AI features seamlessly using the server-configured environment keys
// while also supporting optional custom keys via headers if configured.

let currentApiKey = (typeof window !== 'undefined' ? (localStorage.getItem('gemini_api_key') || localStorage.getItem('geminiApiKey') || '') : '') || '';

const getActiveKey = (overrideKey?: string): string => {
  if (overrideKey && overrideKey.trim().length >= 10 && overrideKey !== 'AI Studio Free Tier') {
    return overrideKey.trim();
  }
  if (currentApiKey && currentApiKey.trim().length >= 10 && currentApiKey !== 'AI Studio Free Tier') {
    return currentApiKey.trim();
  }
  if (typeof window !== 'undefined') {
    const keysToCheck = ['gemini_api_key', 'geminiApiKey', 'user_gemini_api_key', 'user_api_key'];
    for (const k of keysToCheck) {
      const saved = localStorage.getItem(k);
      if (saved && saved.trim().length >= 10 && saved !== 'AI Studio Free Tier') {
        currentApiKey = saved.trim();
        return currentApiKey;
      }
    }
  }
  return '';
};

const getHeaders = (overrideKey?: string): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const key = getActiveKey(overrideKey);
  if (key) {
    headers['x-gemini-api-key'] = key;
    headers['x-api-key'] = key;
  }
  return headers;
};

export const geminiService = {
  /**
   * Update the optional custom API key used by the service
   */
  setApiKey: (apiKey: string) => {
    currentApiKey = (apiKey || '').trim();
    if (typeof window !== 'undefined') {
      if (currentApiKey) {
        localStorage.setItem('gemini_api_key', currentApiKey);
        localStorage.setItem('geminiApiKey', currentApiKey);
      } else {
        localStorage.removeItem('gemini_api_key');
        localStorage.removeItem('geminiApiKey');
      }
    }
    if (currentApiKey) {
      const masked = `${currentApiKey.substring(0, 6)}...${currentApiKey.substring(currentApiKey.length - 4)}`;
      console.log(`[GeminiService] Custom API key active: ${masked}`);
    } else {
      console.log('[GeminiService] Using server default Gemini API key');
    }
  },

  getApiKey: (): string => {
    return getActiveKey();
  },

  /**
   * Verify an API key with Google AI Studio via backend endpoint
   */
  verifyApiKey: async (apiKey: string): Promise<{ valid: boolean; message?: string; error?: string; isQuota?: boolean }> => {
    try {
      const response = await fetch('/api/gemini/verify-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey }),
      });
      const data = await response.json();
      return data;
    } catch (err: any) {
      return { valid: false, error: err.message || 'Verification network request failed' };
    }
  },

  /**
   * Fetch market insights via server proxy with Google Search grounding
   */
  fetchMarketInsights: async (
    userRole: string,
    excludeNames: string[] = [],
    industries: string[] = [],
    count: number = 30,
    explicitApiKey?: string
  ): Promise<MarketInsight[]> => {
    try {
      const key = getActiveKey(explicitApiKey);
      const response = await fetch('/api/gemini/market-insights', {
        method: 'POST',
        headers: getHeaders(key),
        body: JSON.stringify({ userRole, excludeNames, industries, count, geminiApiKey: key, apiKey: key }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const err: any = new Error(errorData.error || `Server responded with status ${response.status}`);
        err.status = response.status;
        err.isQuota = !!errorData.isQuota || response.status === 429 || response.status === 402;
        throw err;
      }

      return await response.json();
    } catch (error: any) {
      console.warn('Gemini fetchMarketInsights notice:', error?.message || error);
      throw error;
    }
  },

  /**
   * Fetch prospects via server proxy with Google Search grounding
   */
  fetchProspects: async (
    userRole: string,
    excludeNames: string[] = [],
    industries: string[] = [],
    count: number = 30,
    explicitApiKey?: string
  ): Promise<MarketInsight[]> => {
    try {
      const key = getActiveKey(explicitApiKey);
      const response = await fetch('/api/gemini/prospects', {
        method: 'POST',
        headers: getHeaders(key),
        body: JSON.stringify({ userRole, excludeNames, industries, count, geminiApiKey: key, apiKey: key }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const err: any = new Error(errorData.error || `Server responded with status ${response.status}`);
        err.status = response.status;
        err.isQuota = !!errorData.isQuota || response.status === 429 || response.status === 402;
        throw err;
      }

      return await response.json();
    } catch (error: any) {
      console.warn('Gemini fetchProspects notice:', error?.message || error);
      throw error;
    }
  },

  /**
   * Scan business card via server proxy
   */
  scanBusinessCard: async (base64Image: string): Promise<any> => {
    try {
      const key = getActiveKey();
      const response = await fetch('/api/gemini/scan-card', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ base64Image, geminiApiKey: key }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const err: any = new Error(errorData.error || `Server responded with status ${response.status}`);
        err.status = response.status;
        err.isQuota = !!errorData.isQuota || response.status === 429 || response.status === 402;
        throw err;
      }

      return await response.json();
    } catch (error: any) {
      console.warn('Gemini scanBusinessCard notice:', error?.message || error);
      throw error;
    }
  },

  /**
   * General text/multimodal content generation via server proxy
   */
  generateContent: async (prompt: string, model: string = 'gemini-3.8-flash', config?: any): Promise<string> => {
    try {
      const response = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ prompt, model, config }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with status ${response.status}`);
      }

      const data = await response.json();
      return data.text || '';
    } catch (error) {
      console.error('Gemini generateContent error:', error);
      throw error;
    }
  },

  /**
   * Stream content generation via Server-Sent Events
   */
  generateContentStream: async (
    prompt: string,
    onChunk: (text: string) => void,
    model: string = 'gemini-3.8-flash',
    config?: any
  ): Promise<void> => {
    const response = await fetch('/api/gemini/stream', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ prompt, model, config }),
    });

    if (!response.ok || !response.body) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Stream failed with status ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data: ')) {
          const dataStr = trimmed.slice(6);
          if (dataStr === '[DONE]') {
            return;
          }
          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.text) {
              onChunk(parsed.text);
            } else if (parsed.error) {
              throw new Error(parsed.error);
            }
          } catch (e) {
            // non-json or malformed chunk
          }
        }
      }
    }
  },

  /**
   * Connect to Gemini Live API via WebSocket
   */
  connectLive: (callbacks: {
    onAudio?: (base64PcmAudio: string) => void;
    onText?: (text: string) => void;
    onInterrupted?: () => void;
    onError?: (err: any) => void;
    onClose?: () => void;
  }) => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/live`;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.audio && callbacks.onAudio) {
          callbacks.onAudio(data.audio);
        }
        if (data.text && callbacks.onText) {
          callbacks.onText(data.text);
        }
        if (data.interrupted && callbacks.onInterrupted) {
          callbacks.onInterrupted();
        }
        if (data.error && callbacks.onError) {
          callbacks.onError(new Error(data.error));
        }
        if (data.closed && callbacks.onClose) {
          callbacks.onClose();
        }
      } catch (err) {
        console.error('Error handling live message:', err);
      }
    };

    ws.onerror = (err) => {
      if (callbacks.onError) callbacks.onError(err);
    };

    ws.onclose = () => {
      if (callbacks.onClose) callbacks.onClose();
    };

    return {
      sendAudio: (base64PcmAudio: string) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ audio: base64PcmAudio }));
        }
      },
      sendText: (text: string) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ text }));
        }
      },
      sendVideo: (base64JpegImage: string) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ video: base64JpegImage }));
        }
      },
      close: () => {
        ws.close();
      },
      ws
    };
  }
};
