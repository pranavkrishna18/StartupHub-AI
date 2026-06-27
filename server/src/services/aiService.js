const axios = require('axios');
const AppError = require('../utils/appError');

// Generates prompt for structured startup validation analysis
const buildPrompt = (name, tagline, description, category) => {
  return `
Analyze the following startup concept and provide validation metrics, SWOT analysis, business canvas models, competitive comparisons, milestone roadmaps, and pitch deck blueprints.

Startup Details:
- Name: ${name}
- Tagline: ${tagline}
- Description: ${description}
- Category: ${category}

You MUST return your output in JSON format matching this structure EXACTLY (do not wrap it in markdown codeblocks like \`\`\`json):
{
  "validationScore": <Number between 0 and 100 representing market need, validation potential, and scalability>,
  "feasibilityScore": <Number between 0 and 100 representing technology feasibility and ease of initial build>,
  "swot": {
    "strengths": [<String list of internal startup strengths>],
    "weaknesses": [<String list of internal weaknesses/challenges>],
    "opportunities": [<String list of market opportunities>],
    "threats": [<String list of external threats/market risks>]
  },
  "businessModel": {
    "revenueStreams": [<String list of potential streams>],
    "pricingModel": "<String explanation of recommended pricing strategy>",
    "growthStrategy": [<String list of customer acquisition methods>]
  },
  "competitors": [
    {
      "name": "<String competitor name>",
      "comparison": "<String comparison outline>",
      "differentiation": "<String differentiation opportunity>"
    }
  ],
  "roadmap": [
    {
      "month": "Month 1",
      "milestones": [<String milestones>]
    },
    {
      "month": "Month 2",
      "milestones": [<String milestones>]
    },
    {
      "month": "Month 3",
      "milestones": [<String milestones>]
    }
  ],
  "pitchDeck": {
    "problem": "<String problem context>",
    "solution": "<String product solution definition>",
    "market": "<String market size metrics (TAM/SAM)>",
    "revenue": "<String monetization mechanics summary>",
    "team": "<String roles needed to launch>",
    "vision": "<String 5-year outlook>"
  }
}
`;
};

// 1. Call Gemini REST endpoint
const callGemini = async (prompt, keyIndex) => {
  const keys = [process.env.GEMINI_API_KEY_1, process.env.GEMINI_API_KEY_2];
  const key = keys[keyIndex - 1];

  if (!key) throw new Error(`Gemini key index ${keyIndex} is empty`);

  console.log(`[AI SERVICE] Sending request to Gemini API using Key #${keyIndex}...`);

  const response = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
    {
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        responseMimeType: 'application/json'
      }
    },
    {
      headers: { 'Content-Type': 'application/json' },
      timeout: 25000 // 25 seconds timeout
    }
  );

  const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty response content from Gemini');

  return JSON.parse(text);
};

// 2. Call Groq REST endpoint (Llama-3.1-70b fallback)
const callGroq = async (prompt) => {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('Groq API Key is not configured');

  console.log(`[AI SERVICE] Falling back to Groq Llama-3.1 API...`);

  const response = await axios.post(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' }
    },
    {
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      timeout: 25000
    }
  );

  const content = response.data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty response from Groq Llama');

  return JSON.parse(content);
};

// MAIN WRAPPER WITH ROTATION LOGIC
exports.generateValidationReport = async (name, tagline, description, category) => {
  const prompt = buildPrompt(name, tagline, description, category);
  
  // Try Key #1
  try {
    return await callGemini(prompt, 1);
  } catch (error1) {
    console.warn(`[AI SERVICE WARNING] Key #1 failed: ${error1.message}. Rotating to Key #2...`);
    
    // Try Key #2
    try {
      return await callGemini(prompt, 2);
    } catch (error2) {
      console.warn(`[AI SERVICE WARNING] Key #2 failed: ${error2.message}. Falling back to Groq...`);
      
      // Try Groq
      try {
        return await callGroq(prompt);
      } catch (errorGroq) {
        console.error(`[AI SERVICE ERROR] All models and fallback mechanisms failed!`);
        throw new AppError('AI services are currently busy or rate-limited. Please try again in a few moments.', 503);
      }
    }
  }
};
