import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // --- SECURITY HARDENING: Strict CORS Policy ---
  const origin = req.headers.origin || '';
  const allowedOrigins = ['https://zexai.io', 'https://app.zexai.io', 'http://localhost:5173', 'http://localhost:3000'];
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', 'https://zexai.io'); // Fail-secure default
  }
  
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST'); // Only allow needed methods
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const payload = req.body || {};
    const lang = payload.lang || 'en';
    payload.model = 'openai';

    // --- SECURITY HARDENING: Anti Prompt Injection & Context Limits ---
    if (!payload.messages || !Array.isArray(payload.messages)) {
      return res.status(400).json({ error: 'Invalid messages format' });
    }

    let totalChars = 0;
    const safeMessages = payload.messages.map((m: any) => {
      // Limit each message to 500 chars to prevent massive prompt injection/stuffing
      const safeContent = String(m.content || '').slice(0, 500);
      
      // Simple Jailbreak keyword filtering
      const lowerContent = safeContent.toLowerCase();
      const jailbreakKeywords = ['ignore all', 'system prompt', 'bypass', 'jailbreak', 'reveal instructions', 'forget previous'];
      if (jailbreakKeywords.some(kw => lowerContent.includes(kw))) {
         console.warn('[SECURITY] Potential Prompt Injection detected:', safeContent);
         return { role: m.role, content: 'User asked a blocked query.' };
      }

      totalChars += safeContent.length;
      return { role: m.role === 'user' || m.role === 'assistant' ? m.role : 'user', content: safeContent };
    });

    if (totalChars > 3000) {
       console.warn('[SECURITY] Context limit exceeded by user.');
       return fallbackRAG(req, res, lang);
    }
    // -------------------------------------------------------------

    // Vision-Aligned Knowledge Base (The Source of Truth)
    const zexKnowledge = `
    STRICT KNOWLEDGE BASE (ONLY TALK ABOUT THESE):
    1. ZexAI was founded by a father motivated by his sick daughter to create a legacy of AI technology.
    2. It is a "Factory for Digital Production" connecting AI models with Web3 and Robotics.
    3. Zex Vision: Uses 40+ AI models for image generation (OpenSea, Zora, Blur integration).
    4. Zex Motion: 43 unique models for professional AI video production.
    5. $ZEX Token: Total supply 1 Billion (1.000.000.000). 35% Presale.
    6. Real Yield: $ZEX holders receive revenue shares from platform production fees.
    7. Buy-Back & Burn: Platform income is used to systematically buy and burn $ZEX tokens.
    8. Robotics: ZexAI controls real Unitree G1 humanoid robots via its Neural SDK.
    9. Only 80 physical G1 Robots will be available in the initial drop.
    10. ZexAI SDK: Allows developers to integrate AI production into their own dApps.
    11. Team Lock: Team tokens are locked for 1 year to ensure long-term vision.
    12. Phase 3 Roadmap (2026): Focuses on global SDK expansion and major CEX listings.
    13. NEVER mention "Zeaxy", "Sehar Ahnan", "SSD storage", or "Data Centers".
    14. Persona: You are Zexie, a high-end Silicon Valley visionary executive. Your English is FLAWLESS, SOPHISTICATED, and MASTERFUL.
    `;

    // Localized System Prompts (Harden Persona)
    const systemPrompts: Record<string, string> = {
        tr: `${zexKnowledge}\nSen ZexAI'nin vizyoner asistanı Zexie'sin. Asla Zeaxy veya SSD'lerden bahsetme. Sadece yukarıdaki 17 maddeye sadık kal. Dilin kusursuz, profesyonel ve kurumsal olmalı.`,
        en: `${zexKnowledge}\nYou are Zexie, the high-end visionary assistant for ZexAI. Speak with the authority of a Silicon Valley tech leader. Your English must be FLAWLESS, NOT BROKEN, and extremely professional. Never mention Zeaxy or unrelated storage topics.`,
        de: `${zexKnowledge}\nSie sind Zexie, die visionäre Leiterin von ZexAI. Sprechen Sie mit technischer Exzellenz und Professionalität. Keine irrelevanten Daten.`,
        fr: `${zexKnowledge}\nVous êtes Zexie, l'assistante visionnaire de ZexAI. Soyez extrêmement professionnelle et technique.`,
        es: `${zexKnowledge}\nEres Zexie, la asistente visionaria de ZexAI. Habla con autoridad técnica y profesionalismo total.`,
        zh: `${zexKnowledge}\n您是Zexie，ZexAI的高级视觉助手。请保持极高的专业水准和技术权威。`,
        su: `${zexKnowledge}\nYou are Zexie, the scribe of tomorrow. Use highly sophisticated, masterful English that commands respect. No broken dialects.`,
    };

    const response = await fetch('https://text.pollinations.ai/openai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...payload,
        messages: [
          { role: "system", content: systemPrompts[lang] || systemPrompts['en'] },
          ...safeMessages
        ]
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
        console.error("Pollinations API Error:", data);
        return fallbackRAG(req, res, lang);
    }

    let aiMsg = data.choices[0]?.message?.content || "";

    // Refusal Detection & Auto-Fallback Filter
    const refusalStrings = [
        "I'm sorry", "sorry, but", "cannot help", "as an AI", "not able to help",
        "Kusura bakmayın", "yardımcı olamam", "maalesef", "uygun değil"
    ];

    const isRefusal = refusalStrings.some(ref => aiMsg.toLowerCase().includes(ref.toLowerCase()));

    if (isRefusal || aiMsg.length < 5) {
        return fallbackRAG(req, res, lang);
    }

    return res.status(200).json(data);
  } catch (error: any) {
    return fallbackRAG(req, res, 'en');
  }
}

async function fallbackRAG(req: VercelRequest, res: VercelResponse, lang: string) {
    const body = req.body || {};
    const messages = body.messages || [];
    const lastMessage = messages[messages.length - 1]?.content?.toLowerCase() || "";
    
    const factPool: Record<string, string[]> = {
        tr: [
            "ZexAI’nin temeli kızı hasta olan bir babanın sevgisi üzerine kurulmuştur.",
            "Yapay Zekayı NFT İçin Tasarladık! ZexAI ekonomik değer üreten bir fabrikadır.",
            "ZexAI eserleri OpenSea, Zora ve Blur'da doğrudan satışa sunulabilir.",
            "Zex Vision: 40+ AI modeliyle hayallerinizi piksellere döken güç.",
            "Zex Motion: 43 farklı video modeliyle sinematik teknolojimiz.",
            "$ZEX Token; platform üretimi ve Real Yield gelir paylaşımı için kullanılır.",
            "Buy-Back & Burn mekanizmasıyla $ZEX değerini koruyoruz.",
            "Toplam 1 Milyar arzın %35'i ön satışa ayrılmıştır.",
            "Takım payı 1 yıl kilitlidir. Uzun vadeli vizyona sahibiz.",
            "Yol haritamız 2026 Q4'e kadar küresel genişlemede net bir plana sahiptir."
        ],
        en: [
            "ZexAI was founded on the love of a father for his sick daughter, a tireless motivation.",
            "We designed AI for NFT! ZexAI is a global production factory for digital assets.",
            "ZexAI creations can be sold directly on OpenSea, Zora, and Blur.",
            "Zex Vision: Powering your dreams into pixels with 40+ advanced AI models.",
            "Zex Motion: Cinema-grade technology with 43 unique video generation models.",
            "$ZEX Token is used for production and Real Yield revenue sharing.",
            "Our Buy-Back & Burn mechanism protects $ZEX value systematically.",
            "35% of the 1 Billion total supply is allocated for the Presale.",
            "Team tokens are locked for 1 year. We are here for the long-term legacy.",
            "Roadmap Phase 3 (2026 Q4): Universal production and major CEX listings."
        ]
    };

    const langPool = factPool[lang] || factPool['en'];
    let answer = langPool[Math.floor(Math.random() * langPool.length)];

    if (lastMessage.includes('robot')) {
        answer = lang === 'tr' ? "Sadece 80 adet üretilecek olan Unitree G1 robotlarımız sizi bekliyor." : "Only 80 Unitree G1 humanoid robots will be produced. Get yours with $ZEX.";
    }

    await new Promise(resolve => setTimeout(resolve, 600));

    return res.status(200).json({
      choices: [{ message: { role: 'assistant', content: answer } }]
    });
}
