import express from 'express';
import { createServer as createViteServer } from 'vite';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI, Type, ThinkingLevel, Modality, LiveServerMessage } from "@google/genai";
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

// Debug: Log available environment variables (keys only for security)
console.log('Available environment variables:', Object.keys(process.env).filter(key => 
  key.includes('API') || key.includes('KEY') || key.includes('GEMINI') || key.includes('GOOGLE') || key.includes('GMAIL')
));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to safely parse JSON arrays from model responses (handling optional markdown code blocks)
function parseJsonArrayFromText(rawText: string): any[] {
  if (!rawText) return [];
  let cleaned = rawText.trim();
  // Strip markdown code fences
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && Array.isArray(parsed.projects)) return parsed.projects;
    if (parsed && Array.isArray(parsed.prospects)) return parsed.prospects;
    if (parsed && Array.isArray(parsed.items)) return parsed.items;
    if (typeof parsed === 'object') return [parsed];
    return [];
  } catch (e) {
    // Attempt regex extraction of JSON array
    const match = cleaned.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (e2) {
        console.warn('[Gemini] Regex JSON parse fallback failed:', e2);
      }
    }
    return [];
  }
}

function parseJsonFromText(rawText: string): any {
  if (!rawText) return {};
  let cleaned = rawText.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (e2) {
        console.warn('[Gemini] Regex JSON object parse fallback failed:', e2);
      }
    }
    return {};
  }
}

// Server-side Gemini client factory supporting headers, body, query, and environment keys
const getAiClient = (req?: express.Request | http.IncomingMessage) => {
  let userKey: string | undefined;
  if (req && 'headers' in req) {
    userKey = (req.headers['x-gemini-api-key'] || req.headers['x-api-key'] || req.headers['authorization']) as string;
    if (userKey && userKey.startsWith('Bearer ')) {
      userKey = userKey.slice(7);
    }
  }
  if (!userKey && req && 'body' in req && req.body) {
    userKey = req.body.geminiApiKey || req.body.apiKey;
  }
  if (!userKey && req && 'query' in req && req.query) {
    userKey = (req.query.geminiApiKey || req.query.apiKey) as string;
  }

  if (userKey && typeof userKey === 'string') {
    userKey = userKey.trim().replace(/^["']|["']$/g, '');
  }
  
  const isCustom = !!(userKey && userKey.length >= 10 && userKey !== 'undefined' && userKey !== 'null' && userKey !== 'AI Studio Free Tier');
  const apiKey = isCustom
    ? userKey!.trim()
    : (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.API_KEY || '');

  console.log(`[Gemini Proxy] Request using key: ${apiKey ? apiKey.substring(0, 6) + '...' + apiKey.substring(apiKey.length - 4) : 'NONE'} (source: ${isCustom ? 'USER_SETTINGS_API_KEY' : 'SERVER_ENV'})`);

  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
};

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' })); // Increased limit for high-res mobile photos
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Request Logging Middleware
  app.use((req, res, next) => {
    if (req.url.startsWith('/api')) {
      console.log(`[API Request] ${req.method} ${req.url}`);
    }
    next();
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    const hasKey = !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.API_KEY);
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      nodeEnv: process.env.NODE_ENV,
      geminiConfigured: hasKey,
      gmailConfigured: !!process.env.GMAIL_USER && !!process.env.GMAIL_APP_PASSWORD
    });
  });

  // ==========================================
  // GEMINI SERVER-SIDE API ROUTES
  // ==========================================

  // 0. Verify Gemini API Key Endpoint
  app.post('/api/gemini/verify-key', async (req, res) => {
    try {
      let keyToTest = (req.body?.apiKey || req.headers['x-gemini-api-key'] || req.headers['x-api-key'] || '').toString().trim().replace(/^["']|["']$/g, '');
      if (!keyToTest || keyToTest.length < 10) {
        return res.status(400).json({ valid: false, error: 'API key is too short or empty' });
      }

      const ai = new GoogleGenAI({
        apiKey: keyToTest,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: 'Say OK in one word',
      });

      return res.json({ 
        valid: true, 
        message: 'API Key verified successfully with Google AI Studio!',
        model: 'gemini-3.8-flash',
        response: response.text?.trim()
      });
    } catch (err: any) {
      console.warn('[Gemini] Key verification error:', err?.message || err);
      const errMsg = (err?.message || '').toLowerCase();
      const isQuota = errMsg.includes('resource_exhausted') || errMsg.includes('429') || errMsg.includes('402') || errMsg.includes('prepayment') || errMsg.includes('depleted') || errMsg.includes('quota');
      return res.status(400).json({
        valid: false,
        error: err?.message || 'Invalid Gemini API key',
        isQuota
      });
    }
  });

  // 1. Market Insights Route (with Google Search Grounding)
  app.post('/api/gemini/market-insights', async (req, res) => {
    try {
      const { userRole, excludeNames = [], industries = [], count = 30 } = req.body;
      const ai = getAiClient(req);
      const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      const excludeList = excludeNames && excludeNames.length > 0 
        ? `\n\nCRITICAL: DO NOT include any of these projects as they are already in my list: ${excludeNames.join(', ')}` 
        : '';
      const industryList = industries && industries.length > 0 
        ? `\n\nFocus specifically on these industries: ${industries.join(', ')}` 
        : '';

      const prompt = `As a senior UAE Sales Engineer in industrial automation, motor controls (VFDs, soft starters), power quality (harmonic filters, capacitor banks), and electrical panel solutions, search for active, real-world commercial, industrial, infrastructure, and utility projects and tenders in the UAE (Dubai, Abu Dhabi, Sharjah, Ajman, Ras Al Khaimah, Fujairah). ${industryList}
      
      TODAY'S DATE IS: ${today}.
      
      CRITICAL REAL-WORLD REQUIREMENTS:
      1. REAL UAE PROJECTS ONLY: Search for genuine projects (e.g., DEWA substations, SEWA power/water plants, ADNOC facilities, Emaar, Aldar, Dubai Municipality, Tadweer, Masdar, AD Ports, Dubai South, Dubal, EGA, Dubai Metro, Etihad Rail).
      2. VERIFIED TENDER / PROJECT URL: Provide a real, working web URL (tenderLink) to the official portal, government tender notice, or verified UAE construction/project news (e.g., dewa.gov.ae, sewa.gov.ae, adnoc.ae, zawya.com, meed.com, dubaisouth.ae, aldardev.com).
      3. AUTHENTIC CONTRACTOR & CONSULTANT: Name the actual Main Contractor, MEP Contractor (e.g. BK Gulf, Voltas, Danway, Al Futtaim Engineering, Khansaheb, China State, Larsen & Toubro UAE) or Consultant (e.g. WSP, AtkinsRéalis, Mott MacDonald, Parsons, KEO).
      4. GENUINE CONTACT DETAILS: Include the actual department or title (e.g., Procurement Director, MEP Project Manager, Tenders Lead), verified UAE office phone number formatted as +971 ... (e.g. +971 4 ..., +971 2 ...), and direct business or procurement email (e.g. procurement@..., info@..., tenders@...).
      5. OFFICIAL WEBSITE: Provide the official website of the contractor, client, or consultant.
      6. SCOPE: Detail the electrical and automation requirements (e.g., MCC panels, PLC/SCADA, VFD pump panels, active harmonic filters, 11kV switchgear).
      ${excludeList}

      Return ONLY a JSON array with ${Math.min(count, 35)} items. Format each object exactly like this:
      [
        {
          "projectName": "Project Title",
          "location": "City, UAE",
          "status": "Tender" | "Under Construction" | "Newly Acquired",
          "category": "Industrial Automation & PLCs" | "HVAC & Pump Controls" | "Industrial Modernization" | "Building Electrical (MDB/DB/MCC)" | "Power Quality & Harmonics" | "OEM Panel Building" | "General Tender",
          "contractor": "MEP / Main Contractor Name",
          "consultant": "Consultant Firm Name",
          "contactPerson": "Contact Person / Role",
          "contactPhone": "+971 X XXX XXXX",
          "contactEmail": "email@domain.ae",
          "tenderLink": "https://...",
          "website": "https://...",
          "companyDetails": "Brief background of the contractor/client",
          "description": "Project overview",
          "relevance": "Why relevant to automation/electrical",
          "scope": "Specific electrical scope",
          "publishedDate": "Month Year",
          "lat": 25.2048,
          "lng": 55.2708
        }
      ]`;

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          systemInstruction: "You are an expert UAE industrial intelligence researcher. Use Google Search to find real, active UAE projects and tenders. Return ONLY a valid JSON array of project objects without markdown outside the array.",
        },
      });

      // Extract any grounding web chunks found by Google Search to enrich links
      const groundingChunks = (response as any).candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const searchUrls = groundingChunks
        .map((chunk: any) => chunk.web?.uri)
        .filter((uri: string) => uri && uri.startsWith('http'));

      const list = parseJsonArrayFromText(response.text || "[]");
      const insights = list.map((insight: any, index: number) => {
        const stableId = `insight-${(insight.projectName || 'project').replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${(insight.location || 'uae').replace(/[^a-z0-9]/gi, '-').toLowerCase()}`;
        // If tenderLink is missing or placeholder, backfill with a real search result URL if available
        let tenderLink = insight.tenderLink;
        if ((!tenderLink || tenderLink.includes('example.com') || tenderLink.length < 10) && searchUrls[index % searchUrls.length]) {
          tenderLink = searchUrls[index % searchUrls.length];
        }

        return {
          ...insight,
          id: stableId,
          tenderLink: tenderLink || insight.website || 'https://www.dewa.gov.ae/en/supplier/tenders',
          dateFound: new Date().toISOString(),
          type: 'project'
        };
      });

      res.json(insights);
    } catch (error: any) {
      console.warn('[Gemini] Note in /api/gemini/market-insights:', error?.message || error);
      const errMsg = (error?.message || '').toLowerCase();
      const isQuota = errMsg.includes('resource_exhausted') || errMsg.includes('429') || errMsg.includes('402') || errMsg.includes('prepayment') || errMsg.includes('depleted') || errMsg.includes('quota');
      res.status(isQuota ? 429 : 500).json({ error: error?.message || 'Failed to fetch market insights', isQuota });
    }
  });

  // 2. Prospects Route (with Google Search Grounding)
  app.post('/api/gemini/prospects', async (req, res) => {
    try {
      const { userRole, excludeNames = [], industries = [], count = 30 } = req.body;
      const ai = getAiClient(req);
      const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      const excludeList = excludeNames && excludeNames.length > 0 
        ? `\n\nCRITICAL: DO NOT include any of these companies as they are already in my list: ${excludeNames.join(', ')}` 
        : '';
      const industryList = industries && industries.length > 0 
        ? `\n\nFocus specifically on these industries: ${industries.join(', ')}` 
        : '';

      const prompt = `As a senior UAE Sales Engineer in automation, motor controls, power quality, and industrial electrical solutions, search for real, registered UAE companies, OEMs, panel builders, industrial plants, and facilities in UAE business hubs (JAFZA, Dubai Industrial City, KIZAD / KEZAD Abu Dhabi, Al Quoz, Sharjah Industrial Areas, Hamriyah Free Zone). ${industryList}
      
      TODAY'S DATE IS: ${today}.
      
      CRITICAL REQUIREMENTS:
      1. REAL COMPANIES: Must be genuine, active businesses in the UAE (e.g. pump manufacturers, generator packagers, panel builders, food processing plants, metal & packaging factories, water treatment specialists, MEP contractors).
      2. REAL CONTACT DETAILS: Include the actual contact name/designation (e.g., General Manager, Procurement Head, Technical Director, Electrical Head), verified UAE office telephone number (+971 ...), and business email.
      3. REAL WEBSITE: Include the actual company website URL (e.g. https://www.company.ae or https://www.company.com).
      4. SCOPE & OPPORTUNITY: Describe why to approach them today (e.g., panel builder needing VFDs/PLCs, factory expanding production line, water plant requiring motor control centers).
      ${excludeList}

      Return ONLY a JSON array with ${Math.min(count, 35)} items. Format each object exactly like this:
      [
        {
          "projectName": "Company Name",
          "location": "City, UAE Hub",
          "category": "Industrial Automation & PLCs" | "HVAC & Pump Controls" | "Industrial Modernization" | "Building Electrical (MDB/DB/MCC)" | "Power Quality & Harmonics" | "OEM Panel Building",
          "scope": "Opportunity and expected scope",
          "contactPerson": "Contact Person / Role",
          "contactPhone": "+971 X XXX XXXX",
          "contactEmail": "contact@company.ae",
          "description": "Company profile & facility details",
          "relevance": "Why relevant for sales approach",
          "website": "https://www.company.com",
          "companyDetails": "Key business operations in UAE",
          "publishedDate": "Month Year",
          "lat": 25.2048,
          "lng": 55.2708,
          "tenderLink": "https://www.company.com"
        }
      ]`;

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          systemInstruction: "You are an expert UAE commercial intelligence researcher. Use Google Search to find real, active UAE industrial prospects, OEMs, and panel builders. Return ONLY a valid JSON array without markdown outside the array.",
        },
      });

      const groundingChunks = (response as any).candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const searchUrls = groundingChunks
        .map((chunk: any) => chunk.web?.uri)
        .filter((uri: string) => uri && uri.startsWith('http'));

      const list = parseJsonArrayFromText(response.text || "[]");
      const prospects = list.map((prospect: any, index: number) => {
        const stableId = `prospect-${(prospect.projectName || 'prospect').replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${(prospect.location || 'uae').replace(/[^a-z0-9]/gi, '-').toLowerCase()}`;
        let link = prospect.tenderLink || prospect.website;
        if ((!link || link.includes('example.com') || link.length < 10) && searchUrls[index % searchUrls.length]) {
          link = searchUrls[index % searchUrls.length];
        }

        return {
          ...prospect,
          id: stableId,
          status: 'Active Prospect',
          website: prospect.website || link,
          tenderLink: link || prospect.website,
          dateFound: new Date().toISOString(),
          type: 'prospect'
        };
      });

      res.json(prospects);
    } catch (error: any) {
      console.warn('[Gemini] Note in /api/gemini/prospects:', error?.message || error);
      const errMsg = (error?.message || '').toLowerCase();
      const isQuota = errMsg.includes('resource_exhausted') || errMsg.includes('429') || errMsg.includes('402') || errMsg.includes('prepayment') || errMsg.includes('depleted') || errMsg.includes('quota');
      res.status(isQuota ? 429 : 500).json({ error: error?.message || 'Failed to fetch prospects', isQuota });
    }
  });

  // 3. Scan Business Card Route
  app.post('/api/gemini/scan-card', async (req, res) => {
    try {
      const { base64Image } = req.body;
      if (!base64Image) {
        return res.status(400).json({ error: 'base64Image is required' });
      }

      const ai = getAiClient(req);
      const cleanBase64 = base64Image.includes('base64,') 
        ? base64Image.split('base64,')[1] 
        : base64Image;

      const prompt = `Extract business card details. Return ONLY JSON.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: {
          parts: [
            { text: prompt },
            { inlineData: { data: cleanBase64, mimeType: "image/jpeg" } }
          ]
        },
        config: {
          systemInstruction: "You are a professional business card scanner. Extract contact details accurately into JSON format. Return ONLY JSON.",
          responseMimeType: "application/json",
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              salutation: { type: Type.STRING },
              firstName: { type: Type.STRING },
              lastName: { type: Type.STRING },
              designation: { type: Type.STRING },
              accountName: { type: Type.STRING },
              email: { type: Type.STRING },
              phone: { type: Type.STRING },
              website: { type: Type.STRING },
              street: { type: Type.STRING },
              city: { type: Type.STRING },
              pinCode: { type: Type.STRING },
              country: { type: Type.STRING },
              notes: { type: Type.STRING },
            }
          }
        }
      });

      const text = response.text || "{}";
      const result = parseJsonFromText(text) || {};
      res.json(result);
    } catch (error: any) {
      console.error('Error in /api/gemini/scan-card:', error);
      res.status(500).json({ error: error.message || 'Failed to scan business card' });
    }
  });

  // 4. General Content Generation
  app.post('/api/gemini/generate', async (req, res) => {
    try {
      const { prompt, contents, model = 'gemini-3.8-flash', config } = req.body;
      const ai = getAiClient(req);
      const inputContents = contents || prompt;
      const response = await ai.models.generateContent({
        model,
        contents: inputContents,
        config: config || undefined,
      });
      res.json({ text: response.text });
    } catch (error: any) {
      console.error('Error in /api/gemini/generate:', error);
      res.status(500).json({ error: error.message || 'Generation failed' });
    }
  });

  // 5. Streaming Route (Server-Sent Events)
  app.post('/api/gemini/stream', async (req, res) => {
    try {
      const { prompt, contents, model = 'gemini-3.8-flash', config } = req.body;
      const ai = getAiClient(req);
      const inputContents = contents || prompt;

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const responseStream = await ai.models.generateContentStream({
        model,
        contents: inputContents,
        config: config || undefined,
      });

      for await (const chunk of responseStream) {
        if (chunk.text) {
          res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
        }
      }
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (error: any) {
      console.error('Error in /api/gemini/stream:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: error.message || 'Stream generation failed' });
      } else {
        res.write(`data: ${JSON.stringify({ error: error.message || 'Stream error' })}\n\n`);
        res.end();
      }
    }
  });

  // Email endpoint
  app.post('/api/send-email', async (req, res) => {
    const { to, subject, html, text } = req.body;

    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD;

    if (!user || !pass) {
      console.error('Email credentials not configured');
      return res.status(500).json({ error: 'Email service not configured on server' });
    }

    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass }
      });

      await transporter.sendMail({
        from: `"CRM System" <${user}>`,
        to,
        subject,
        text,
        html
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Error sending email:', error);
      res.status(500).json({ error: 'Failed to send email' });
    }
  });

  // ==========================================
  // GEMINI LIVE API WEBSOCKET BRIDGE
  // ==========================================
  const wss = new WebSocketServer({ noServer: true });

  wss.on('connection', async (clientWs: WebSocket, request: http.IncomingMessage) => {
    console.log('[Live API] Client connected to WebSocket');
    let session: any = null;

    try {
      const ai = getAiClient(request);
      session = await ai.live.connect({
        model: "gemini-3.8-live",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction: "You are a helpful AI voice assistant for the Sales Perks CRM system.",
        },
        callbacks: {
          onmessage: (message: LiveServerMessage) => {
            try {
              for (const part of message.serverContent?.modelTurn?.parts ?? []) {
                if (part.inlineData?.data) {
                  clientWs.send(JSON.stringify({ audio: part.inlineData.data }));
                }
                if (part.text) {
                  clientWs.send(JSON.stringify({ text: part.text }));
                }
              }
              if (message.serverContent?.interrupted) {
                clientWs.send(JSON.stringify({ interrupted: true }));
              }
            } catch (err) {
              console.error('[Live API] Error forwarding message to client:', err);
            }
          },
          onerror: (err: any) => {
            console.error('[Live API] Session error:', err);
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ error: err?.message || 'Live API session error' }));
            }
          },
          onclose: () => {
            console.log('[Live API] Session closed by server');
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ closed: true }));
            }
          }
        },
      });

      clientWs.on('message', (data: any) => {
        try {
          const parsed = JSON.parse(data.toString());
          if (parsed.audio) {
            session.sendRealtimeInput({
              audio: { data: parsed.audio, mimeType: "audio/pcm;rate=16000" },
            });
          } else if (parsed.text) {
            session.sendRealtimeInput({
              text: parsed.text,
            });
          } else if (parsed.video) {
            session.sendRealtimeInput({
              video: { data: parsed.video, mimeType: "image/jpeg" },
            });
          }
        } catch (err) {
          console.error('[Live API] Error processing message from client:', err);
        }
      });

      clientWs.on('close', () => {
        console.log('[Live API] Client disconnected');
        try {
          session?.close();
        } catch (e) {
          // ignore
        }
      });
    } catch (error: any) {
      console.error('[Live API] Failed to establish Gemini Live connection:', error);
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({ error: error?.message || 'Failed to connect to Gemini Live' }));
        clientWs.close();
      }
    }
  });

  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`);
    if (url.pathname === '/live' || url.pathname === '/ws/live' || url.pathname === '/api/gemini/live') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
    // Note: Do not destroy other upgrade requests (e.g. Vite HMR if enabled)
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

