require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');
const mammoth = require('mammoth');
const { getCencoriClient } = require('./cencoriClient');

// Load .env manually so CENCORI_API_KEY is available
const envPath = path.resolve(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, ...rest] = line.split('=');
    if (key && !key.startsWith('#') && !key.startsWith('\n')) {
      const k = key.trim();
      const value = rest.join('=').trim().replace(/^["']|["']$/g, '');
      if (k && !process.env[k]) {
        process.env[k] = value;
      }
    }
  });
}

const app = express();
const port = 3001;

// Allow requests from the Vite frontend
app.use(cors({
  origin: 'http://localhost:3000'
}));

app.use(express.json());

// Configure multer to store uploaded files in memory
const upload = multer({ storage: multer.memoryStorage() });

app.get('/', (req, res) => {
  res.json({ status: 'Custom Document Parser API is running properly' });
});

const cencoriClient = (() => {
  try {
    return getCencoriClient();
  } catch (error) {
    console.warn(error.message || 'Missing CENCORI_API_KEY in server environment.');
    return null;
  }
})();

const MODEL = 'gemini-2.5-flash';

const RESUME_SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    role: { type: 'string' },
    email: { type: 'string' },
    phone: { type: 'string' },
    location: { type: 'string' },
    summary: { type: 'string' },
    experience: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          company: { type: 'string' },
          period: { type: 'string' },
          description: { type: 'string' },
        },
        required: ['title', 'company', 'period', 'description'],
      },
    },
    skills: { type: 'array', items: { type: 'string' } },
    education: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          degree: { type: 'string' },
          school: { type: 'string' },
          year: { type: 'string' },
        },
        required: ['degree', 'school', 'year'],
      },
    },
    certificates: { type: 'array', items: { type: 'string' } },
    customSections: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                text: { type: 'string' },
              },
              required: ['text'],
            },
          },
        },
        required: ['name', 'items'],
      },
    },
  },
  required: ['name', 'role', 'email', 'phone', 'location', 'summary', 'experience', 'skills', 'education', 'certificates', 'customSections'],
};

const extractJson = (text) => {
  if (!text) return null;
  try {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fenced && fenced[1]) {
      return JSON.parse(fenced[1].trim());
    }

    const trimmed = text.trim();
    if (/^```/i.test(trimmed)) {
      const cleaned = trimmed
        .replace(/^```(?:json)?/i, '')
        .replace(/```$/i, '')
        .trim();
      if (cleaned) {
        return JSON.parse(cleaned);
      }
    }

    const objectIndex = trimmed.indexOf('{');
    const arrayIndex = trimmed.indexOf('[');
    let startIndex = -1;
    if (objectIndex >= 0 && arrayIndex >= 0) {
      startIndex = Math.min(objectIndex, arrayIndex);
    } else {
      startIndex = objectIndex >= 0 ? objectIndex : arrayIndex;
    }

    if (startIndex >= 0) {
      const endIndex = Math.max(trimmed.lastIndexOf('}'), trimmed.lastIndexOf(']'));
      if (endIndex > startIndex) {
        return JSON.parse(trimmed.slice(startIndex, endIndex + 1));
      }
      return null;
    }

    return JSON.parse(trimmed);
  } catch (error) {
    console.error('Failed to parse JSON:', error);
    return null;
  }
};

const parseResumeResponse = (text) => {
  const parsed = extractJson(text || '{}');
  if (!parsed) return null;

  if (parsed.experience) {
    parsed.experience = parsed.experience.map((exp, i) => ({ ...exp, id: exp.id || `exp-${i}` }));
  } else {
    parsed.experience = [];
  }

  if (parsed.education) {
    parsed.education = parsed.education.map((ed, i) => ({ ...ed, id: ed.id || `ed-${i}` }));
  } else {
    parsed.education = [];
  }

  if (!parsed.skills) parsed.skills = [];
  if (!parsed.certificates) parsed.certificates = [];

  if (parsed.customSections) {
    parsed.customSections = parsed.customSections.map((section, sectionIndex) => ({
      ...section,
      id: section.id || `custom-${sectionIndex}`,
      items: (section.items || []).map((item, itemIndex) => ({
        ...item,
        id: item.id || `custom-${sectionIndex}-item-${itemIndex}`,
      })),
    }));
  } else {
    parsed.customSections = [];
  }

  return parsed;
};

app.post('/api/parse', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No document file uploaded' });
    }

    const { buffer, mimetype, originalname } = req.file;
    let extractedText = '';

    console.log(`Parsing file: ${originalname} (${mimetype})`);

    if (mimetype === 'application/pdf') {
      const parser = new PDFParse({ data: buffer });
      const data = await parser.getText();
      extractedText = data.text;
    } else if (
      mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
      originalname.endsWith('.docx')
    ) {
      const result = await mammoth.extractRawText({ buffer });
      extractedText = result.value;
    } else if (mimetype === 'text/plain' || originalname.endsWith('.txt')) {
      extractedText = buffer.toString('utf-8');
    } else {
      return res.status(400).json({ error: 'Unsupported file format. Please upload PDF, DOCX, or TXT.' });
    }

    res.json({ text: extractedText });
  } catch (error) {
    console.error('Error parsing document:', error);
    res.status(500).json({ error: 'Failed to parse document' });
  }
});

app.post('/api/ai/suggestions', express.json(), async (req, res) => {
  try {
    if (!cencoriClient) {
      return res.status(500).json({ error: 'Cencori API key missing on server.' });
    }
    const { resume, jobContext } = req.body || {};
    if (!resume) {
      return res.status(400).json({ error: 'Missing resume payload.' });
    }

    const response = await cencoriClient.ai.chat({
      model: MODEL,
      temperature: 0.6,
      messages: [
        {
          role: 'user',
          content: `Analyze this resume ${jobContext ? `against this job context: "${jobContext}"` : ''} and provide 3-5 punchy, high-impact rewrite suggestions to improve ATS score and professional impact.

CRITICAL: Focus on CONCISENESS. Suggestions should be brief but powerful to ensure the resume fits well on the page. Use strong action verbs and quantify results where possible.

Format as JSON array of objects with keys: id, type (REWRITE, IMPACT, QUANTIFY), original (the specific text part being improved), suggestion (the improved text), field (which field it belongs to).

CRITICAL: For experience fields, the 'field' value MUST be 'experience:<id>' where <id> is the ID provided in the context. For the summary, use 'summary'. Your entire response must be ONLY the raw JSON array.

Resume Context:
Name: ${resume.name}
Role: ${resume.role}
Summary [ID: summary]: ${resume.summary}
Experience Items:
${(resume.experience || []).map((item) => `[ID: ${item.id}] ${item.description}`).join('\n')}`,
        },
      ],
    });

    const suggestions = extractJson(response.content || '[]') || [];
    return res.json({ suggestions });
  } catch (error) {
    console.error('AI Suggestions Error:', error);
    return res.status(500).json({ error: 'Failed to generate suggestions.' });
  }
});

app.post('/api/ai/ats-score', express.json(), async (req, res) => {
  try {
    if (!cencoriClient) {
      return res.status(500).json({ error: 'Cencori API key missing on server.' });
    }
    const { resume, jobContext } = req.body || {};
    if (!resume) {
      return res.status(400).json({ error: 'Missing resume payload.' });
    }

    let baseScore = 0;
    if (resume.name && resume.name.trim() !== 'Fullname Here') baseScore += 2;
    if (resume.email && resume.email.includes('@') && resume.email !== 'name@email.com') baseScore += 4;
    if (resume.phone && resume.phone.trim().length > 6 && !resume.phone.includes('555 0192')) baseScore += 4;

    if (resume.summary && resume.summary.length > 50 && !resume.summary.includes('A brief summary')) baseScore += 5;
    if (resume.experience && resume.experience.length > 0 && resume.experience[0].company !== 'Company Name') {
      baseScore += 5;
      const avgDescLength = resume.experience.reduce((acc, exp) => acc + exp.description.length, 0) / resume.experience.length;
      if (avgDescLength > 80) baseScore += 5;
    }

    if (resume.skills && resume.skills.length > 3 && resume.skills[0] !== 'Skill 1') baseScore += 3;
    if (resume.education && resume.education.length > 0 && resume.education[0].degree !== 'Degree Name') baseScore += 2;

    const resumeText = [
      resume.summary,
      ...(resume.experience || []).map((exp) => `${exp.title} ${exp.description}`),
      ...(resume.skills || []),
    ].join(' ').toLowerCase();

    let keywordScore = 0;
    if (jobContext && jobContext.trim().length > 0) {
      const jobWords = jobContext.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter((word) => word.length > 4);
      const uniqueJobWords = [...new Set(jobWords)];

      let matchCount = 0;
      uniqueJobWords.forEach((word) => {
        if (resumeText.includes(word)) matchCount += 1;
      });

      const matchPercentage = uniqueJobWords.length > 0 ? matchCount / uniqueJobWords.length : 0;
      keywordScore = Math.min(40, Math.floor(matchPercentage * 50));
    } else {
      const actionVerbs = ['managed', 'developed', 'led', 'created', 'designed', 'improved', 'increased', 'reduced', 'implemented', 'achieved', 'optimized', 'spearheaded', 'resolved', 'delivered', 'orchestrated'];
      let verbCount = 0;
      actionVerbs.forEach((verb) => {
        if (resumeText.includes(verb)) verbCount += 1;
      });
      keywordScore = Math.min(40, verbCount * 4);
    }

    const semanticResponse = await cencoriClient.ai.chat({
      model: MODEL,
      temperature: 0.2,
      messages: [
        {
          role: 'user',
          content: `Evaluate the overall professional formatting, structural flow, and semantic value of this resume. ${jobContext ? `Consider how well the semantic narrative aligns with this job context: "${jobContext}"` : 'Evaluate against general industry ATS standards.'}

Resume Data:
${JSON.stringify(resume)}

Score the professional strength and impact from 0 to 30.
Return ONLY a JSON object: {"semanticScore": number}`,
        },
      ],
    });

    const parsed = extractJson(semanticResponse.content || '{}');
    const semanticScore = parsed?.semanticScore ? parseInt(parsed.semanticScore, 10) : 15;
    const finalSemanticScore = Number.isNaN(semanticScore) ? 15 : Math.min(30, Math.max(0, semanticScore));

    const totalScore = baseScore + keywordScore + finalSemanticScore;
    return res.json({ score: Math.min(100, Math.max(0, totalScore)) });
  } catch (error) {
    console.error('ATS Score Error:', error);
    return res.status(500).json({ error: 'Failed to calculate ATS score.' });
  }
});

app.post('/api/ai/job-link', express.json(), async (req, res) => {
  try {
    if (!cencoriClient) {
      return res.status(500).json({ error: 'Cencori API key missing on server.' });
    }
    const { url } = req.body || {};
    if (!url) {
      return res.status(400).json({ error: 'Missing job URL.' });
    }

    const response = await cencoriClient.ai.chat({
      model: MODEL,
      temperature: 0.6,
      messages: [
        {
          role: 'user',
          content: `Extract the key job requirements, responsibilities, and desired skills from this URL: ${url}. Provide a concise summary.`,
        },
      ],
    });

    return res.json({ details: response.content || 'Could not extract job details.' });
  } catch (error) {
    console.error('Job Link Analysis Error:', error);
    return res.status(500).json({ error: 'Failed to analyze job link.' });
  }
});

app.post('/api/ai/cover-letter', express.json(), async (req, res) => {
  try {
    if (!cencoriClient) {
      return res.status(500).json({ error: 'Cencori API key missing on server.' });
    }
    const { resume, jobDescription } = req.body || {};
    if (!resume) {
      return res.status(400).json({ error: 'Missing resume payload.' });
    }

    const response = await cencoriClient.ai.chat({
      model: MODEL,
      temperature: 0.7,
      messages: [
        {
          role: 'user',
          content: `Write ONLY THE BODY of a professional cover letter for the following person.
Do NOT include the date, address, formal salutation (like 'Dear...'), or formal closing (like 'Sincerely...').
Focus on 3-4 strong paragraphs matching their skills to the role.

Name: ${resume.name}
Role: ${resume.role}
Skills: ${(resume.skills || []).join(', ')}
Experience Summary: ${resume.summary}

Context/Job Details: ${jobDescription || 'Standard professional application'}`,
        },
      ],
    });

    return res.json({ content: response.content || '' });
  } catch (error) {
    console.error('Cover Letter Error:', error);
    return res.status(500).json({ error: 'Failed to generate cover letter.' });
  }
});

app.post('/api/ai/parse-resume', express.json(), async (req, res) => {
  try {
    if (!cencoriClient) {
      return res.status(500).json({ error: 'Cencori API key missing on server.' });
    }
    const { text } = req.body || {};
    if (!text) {
      return res.status(400).json({ error: 'Missing resume text.' });
    }
    let parsed = null;

    try {
      const response = await cencoriClient.ai.generateObject({
        model: MODEL,
        prompt: `Extract structured resume data from this text. Maintain the professional tone and ensure the descriptions are neatly formatted and VERY concise (max 2-3 bullet points per role). Ensure all experience and education items have unique string IDs.

IMPORTANT: Capture EVERY section in the document. For any section that is NOT covered by the standard fields (name, role, email, phone, location, summary, experience, skills, education, certificates), add it to "customSections" using the EXACT section title as it appears in the document. This includes sections like "Honors and Awards", "Publications", "Projects", "Languages", "Volunteer Work", "References", etc. Do NOT skip or merge any sections.

Text to parse:
${text}`,
        schema: RESUME_SCHEMA,
      });
      parsed = parseResumeResponse(JSON.stringify(response.object || {}));
    } catch (error) {
      console.error('Structured parse failed, retrying with chat output:', error);
    }

    if (!parsed) {
      const response = await cencoriClient.ai.chat({
        model: MODEL,
        temperature: 0.2,
        messages: [
          {
            role: 'system',
            content: 'Return ONLY valid JSON. Do not include prose, markdown, or code fences.',
          },
          {
            role: 'user',
            content: `Extract structured resume data from this text. Maintain the professional tone and ensure the descriptions are neatly formatted and VERY concise (max 2-3 bullet points per role). Ensure all experience and education items have unique string IDs.

IMPORTANT: Capture EVERY section in the document. For any section that is NOT covered by the standard fields (name, role, email, phone, location, summary, experience, skills, education, certificates), add it to "customSections" using the EXACT section title as it appears in the document. This includes sections like "Honors and Awards", "Publications", "Projects", "Languages", "Volunteer Work", "References", etc. Do NOT skip or merge any sections.

Return ONLY a pure JSON object matching this structure fully:
{
  "name": "string",
  "role": "string",
  "email": "string",
  "phone": "string",
  "location": "string",
  "summary": "string",
  "experience": [
    { "id": "exp-1", "title": "string", "company": "string", "period": "string", "description": "string" }
  ],
  "skills": ["skill1", "skill2"],
  "education": [
    { "id": "ed-1", "degree": "string", "school": "string", "year": "string" }
  ],
  "certificates": ["string"],
  "customSections": [
    {
      "id": "custom-1",
      "name": "Exact Section Title From Document",
      "items": [
        { "id": "custom-1-item-1", "text": "item content" }
      ]
    }
  ]
}

Text to parse:
${text}`,
          },
        ],
      });

      parsed = parseResumeResponse(response.content || '{}');
    }

    if (!parsed) {
      return res.status(500).json({ error: 'Failed to parse resume.' });
    }

    return res.json({ parsed });
  } catch (error) {
    console.error('Parse Resume Error:', error);
    return res.status(500).json({ error: 'Failed to parse resume.' });
  }
});

app.post('/api/ai/smoke', express.json(), async (req, res) => {
  try {
    if (!cencoriClient) {
      return res.status(500).json({ error: 'Cencori API key missing on server.' });
    }
    const stream = await cencoriClient.ai.chatStream({
      model: MODEL,
      messages: [{ role: 'user', content: 'Say "ok" only.' }],
    });

    let streamed = '';
    for await (const chunk of stream) {
      streamed += chunk.delta || '';
    }

    const sync = await cencoriClient.ai.chat({
      model: MODEL,
      messages: [{ role: 'user', content: 'Say "ok" only.' }],
    });

    return res.json({ stream: streamed.trim(), nonStream: (sync.content || '').trim() });
  } catch (error) {
    console.error('Smoke Test Error:', error);
    return res.status(500).json({ error: 'Failed smoke test.' });
  }
});

app.listen(port, () => {
  console.log(`Custom Document Parser API running at http://localhost:${port}`);
});
