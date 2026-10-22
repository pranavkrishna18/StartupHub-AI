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
const callGemini = async (prompt, keyIndex, isJson = true) => {
  const keys = [process.env.GEMINI_API_KEY_1, process.env.GEMINI_API_KEY_2];
  const key = keys[keyIndex - 1];

  if (!key) throw new Error(`Gemini key index ${keyIndex} is empty`);

  console.log(`[AI SERVICE] Sending request to Gemini API using Key #${keyIndex}...`);

  const body = {
    contents: [{
      parts: [{ text: prompt }]
    }]
  };

  if (isJson) {
    body.generationConfig = {
      responseMimeType: 'application/json'
    };
  }

  const response = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
    body,
    {
      headers: { 'Content-Type': 'application/json' },
      timeout: 25000 // 25 seconds timeout
    }
  );

  const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty response content from Gemini');

  return isJson ? JSON.parse(text) : text;
};

// 2. Call Groq REST endpoint (Llama-3.1-70b fallback)
const callGroq = async (prompt, isJson = true) => {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('Groq API Key is not configured');

  console.log(`[AI SERVICE] Falling back to Groq Llama-3.1 API...`);

  const body = {
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }]
  };

  if (isJson) {
    body.response_format = { type: 'json_object' };
  }

  const response = await axios.post(
    'https://api.groq.com/openai/v1/chat/completions',
    body,
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

  return isJson ? JSON.parse(content) : content;
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

const buildTalentMatchPrompt = (candidate, job) => {
  return `
You are an expert technical recruiter and talent advisor. Evaluate the following candidate (including their cover message and resume) against the startup job opening and generate a detailed matching score report.

Candidate Profile:
- Full Name: ${candidate.fullName}
- Bio: ${candidate.bio || 'Not provided'}
- Skills: ${candidate.skills ? candidate.skills.join(', ') : 'None'}
- Interests: ${candidate.interests ? candidate.interests.join(', ') : 'None'}
- Role Preference: ${candidate.role}

Job Opening Details:
- Title: ${job.title}
- Responsibilities: ${job.responsibilities}
- Required Skills: ${job.requiredSkills.join(', ')}
- Preferred Skills: ${job.preferredSkills ? job.preferredSkills.join(', ') : 'None'}
- Experience Needed: ${job.experience}
- Compensation: ${job.compensation}
- Work Mode: ${job.workMode}

Application Cover Message:
"${candidate.message}"

Submitted Resume Text:
"""
${candidate.resumeText || 'No resume uploaded'}
"""

Evaluate and output a strict JSON structure representing the matching results. Do not include any markdown format tags like \`\`\`json.
JSON Structure:
{
  "compatibilityScore": <Number between 0 and 100 representing overall suitability>,
  "atsScore": <Number between 0 and 100 representing candidate resume ATS formatting compliance & keyword match with this job opening>,
  "skillMatch": <Number between 0 and 100 representing required skills matching ratio>,
  "experienceMatch": <Number between 0 and 100 representing experience alignment>,
  "cultureMatch": <Number between 0 and 100 representing alignment of candidate bio/interests with startup needs>,
  "communicationScore": <Number between 0 and 100 based on the cover message clarity and tone>,
  "missingSkills": [<List of required job skills the candidate lacks>],
  "strengths": [<List of matching strengths of the candidate for this role>],
  "weaknesses": [<List of gaps or improvement areas of the candidate for this role>],
  "growthSuggestions": [<List of actions/resources the candidate should focus on to improve suitability>],
  "recommendedRole": "<String matching recommended role title>"
}
`;
};


exports.generateTalentMatchReport = async (candidate, job) => {
  const prompt = buildTalentMatchPrompt(candidate, job);
  
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

const buildResumeAnalysisPrompt = (resumeText, activeJobs) => {
  const jobsContext = activeJobs.map(job => `
- JobID: ${job._id}
- StartupID: ${job.startup?._id}
- Startup Name: ${job.startup?.name}
- Title: ${job.title}
- Required Skills: ${job.requiredSkills.join(', ')}
- Experience: ${job.experience}
  `).join('\n');

  return `
You are an expert resume parsing engine and talent screening AI. Analyze the following candidate resume text and match it against the current active startup openings.

Candidate Resume Text:
"""
${resumeText}
"""

Available Startup Openings Context:
${jobsContext || 'No openings currently available'}

Analyze the candidate profile details and output a strict JSON structure representing the parsed details, ATS scores, learning roadmaps, and startup recommendations.
Do not wrap your output in markdown codeblocks like \`\`\`json.

JSON Structure:
{
  "extractedSkills": [<List of technical/business skills found in the resume>],
  "extractedExperience": [<List of past job titles or positions held>],
  "extractedEducation": [<List of degrees, schools, or education milestones>],
  "extractedProjects": [<List of notable side-projects, products, or portfolios described>],
  "extractedCertifications": [<List of credentials or certifications>],
  "extractedInterests": [<List of personal interests/hobbies>],
  "resumeScore": <Number between 0 and 100 representing overall quality/format strength of the resume text>,
  "atsScore": <Number between 0 and 100 representing ATS formatting compliance and content keyword density>,
  "compatibility": <Number between 0 and 100 representing average alignment with the active startup job openings>,
  "missingSkills": [<List of critical required skills the candidate lacks relative to the recommended roles>],
  "learningRoadmap": [<List of concrete roadmap items to acquire missing skills/experience>],
  "recommendedStartups": [
    {
      "startupId": "<The matching StartupID string from the Available Startup Openings Context above>",
      "name": "<The matching Startup Name string from the Available Startup Openings Context above>",
      "matchReason": "<A brief description of why the candidate aligns with this startup's roles>"
    }
  ],
  "recommendedRoles": [<List of recommended titles suitable for this candidate>],
  "personalizedSuggestions": [<List of recommendations/tips to improve the resume or increase chance of hiring>]
}
`;
};

exports.generateResumeAnalysisReport = async (resumeText, activeJobs) => {
  const prompt = buildResumeAnalysisPrompt(resumeText, activeJobs);
  
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

const buildTermSheetPrompt = (startupName, targetRaise, amount, equity, valuation) => {
  return `
You are an expert Silicon Valley venture capital lawyer. Draft a concise, professional Term Sheet Outline based on the following startup fundraising coordinates:

Startup Name: ${startupName}
Target Raise: $${targetRaise.toLocaleString()}
Proposed Investment: $${amount.toLocaleString()}
Equity Percentage: ${equity}%
Pre-Money Valuation: $${valuation.toLocaleString()}

Outline standard legal parameters in neat Markdown format:
1. Investment Structure & Valuation (Pre-money, Post-money, Price per share).
2. Liquidation Preference (1x non-participating preferred, or similar standard VC terms).
3. Board of Directors seat allocation.
4. Protective Provisions & Voting Rights.
5. Right of First Refusal (ROFR) and Co-Sale rights.
6. Confidentiality and NDA clauses.

Include standard legal boilerplate warnings reminding both parties that this term sheet draft is non-binding and generated by AI for planning purposes only. Do not wrap your output in markdown code blocks like \`\`\`markdown.
`;
};

exports.generateTermSheetDraft = async (startupName, targetRaise, amount, equity, valuation) => {
  const prompt = buildTermSheetPrompt(startupName, targetRaise, amount, equity, valuation);
  
  // Try Key #1
  try {
    return await callGemini(prompt, 1, false);
  } catch (error1) {
    console.warn(`[AI SERVICE WARNING] Key #1 failed: ${error1.message}. Rotating to Key #2...`);
    
    // Try Key #2
    try {
      return await callGemini(prompt, 2, false);
    } catch (error2) {
      console.warn(`[AI SERVICE WARNING] Key #2 failed: ${error2.message}. Falling back to Groq...`);
      
      // Try Groq
      try {
        return await callGroq(prompt, false);
      } catch (errorGroq) {
        console.error(`[AI SERVICE ERROR] All models and fallback mechanisms failed!`);
        throw new AppError('AI services are currently busy or rate-limited. Please try again in a few moments.', 503);
      }
    }
  }
};



