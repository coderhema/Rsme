import { Groq } from "groq-sdk";
import { ResumeData, AISuggestion } from "../types";

const groq = new Groq({ 
  apiKey: process.env.GROQ_API_KEY || '',
  dangerouslyAllowBrowser: true 
});

const MODEL = "moonshotai/kimi-k2-instruct-0905";

// Helper to extract JSON from markdown if needed
const extractJson = (text: string) => {
  try {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match) {
      return JSON.parse(match[1]);
    }
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse JSON:", e, text);
    return null;
  }
};

export const getAISuggestions = async (resume: ResumeData, jobContext?: string): Promise<AISuggestion[]> => {
  try {
    const response = await groq.chat.completions.create({
      model: MODEL,
      temperature: 0.6,
      messages: [
        {
          role: "user",
          content: `Analyze this resume ${jobContext ? `against this job context: "${jobContext}"` : ''} and provide 3-5 punchy, high-impact rewrite suggestions to improve ATS score and professional impact. 
      
      CRITICAL: Focus on CONCISENESS. Suggestions should be brief but powerful to ensure the resume fits well on the page. Use strong action verbs and quantify results where possible.
      
      Format as JSON array of objects with keys: id, type (REWRITE, IMPACT, QUANTIFY), original (the specific text part being improved), suggestion (the improved text), field (which field it belongs to).
      
      CRITICAL: For experience fields, the 'field' value MUST be 'experience:<id>' where <id> is the ID provided in the context. For the summary, use 'summary'. Your entire response must be ONLY the raw JSON array.
      
      Resume Context:
      Name: ${resume.name}
      Role: ${resume.role}
      Summary [ID: summary]: ${resume.summary}
      Experience Items:
      ${resume.experience.map(e => `[ID: ${e.id}] ${e.description}`).join('\n')}`
        }
      ]
    });

    return extractJson(response.choices[0]?.message?.content || '[]') || [];
  } catch (error) {
    console.error("AI Suggestions Error:", error);
    return [];
  }
};

export const calculateATSScore = async (resume: ResumeData, jobContext?: string): Promise<number> => {
  try {
    // 1. Base Completeness & Structure (Max 30 points)
    let baseScore = 0;
    
    // Contact Info Checks
    if (resume.name && resume.name.trim() !== "Fullname Here") baseScore += 2;
    if (resume.email && resume.email.includes('@') && resume.email !== "name@email.com") baseScore += 4;
    if (resume.phone && resume.phone.trim().length > 6 && !resume.phone.includes("555 0192")) baseScore += 4;
    
    // Formatting & Section Checks
    if (resume.summary && resume.summary.length > 50 && !resume.summary.includes("A brief summary")) baseScore += 5;
    if (resume.experience && resume.experience.length > 0 && resume.experience[0].company !== "Company Name") {
       baseScore += 5;
       const avgDescLength = resume.experience.reduce((acc, exp) => acc + exp.description.length, 0) / resume.experience.length;
       if (avgDescLength > 80) baseScore += 5;
    }
    
    // Skills & Education Checks
    if (resume.skills && resume.skills.length > 3 && resume.skills[0] !== "Skill 1") baseScore += 3;
    if (resume.education && resume.education.length > 0 && resume.education[0].degree !== "Degree Name") baseScore += 2;

    const resumeText = [
      resume.summary,
      ...resume.experience.map(e => `${e.title} ${e.description}`),
      ...resume.skills
    ].join(' ').toLowerCase();

    // 2. Keyword & Context Matching (Max 40 points)
    let keywordScore = 0;
    if (jobContext && jobContext.trim().length > 0) {
      // Extract meaningful words from job context
      const jobWords = jobContext.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 4);
      const uniqueJobWords = [...new Set(jobWords)];
      
      let matchCount = 0;
      uniqueJobWords.forEach(word => {
        if (resumeText.includes(word)) matchCount++;
      });
      
      const matchPercentage = uniqueJobWords.length > 0 ? (matchCount / uniqueJobWords.length) : 0;
      // Scale percentage to 40 max points
      keywordScore = Math.min(40, Math.floor(matchPercentage * 50)); 
    } else {
      // If no job context, calculate based on standard strong resume keywords / action verbs
      const actionVerbs = ['managed', 'developed', 'led', 'created', 'designed', 'improved', 'increased', 'reduced', 'implemented', 'achieved', 'optimized', 'spearheaded', 'resolved', 'delivered', 'orchestrated'];
      let verbCount = 0;
      actionVerbs.forEach(verb => {
        if (resumeText.includes(verb)) verbCount++;
      });
      keywordScore = Math.min(40, verbCount * 4);
    }

    // 3. AI Semantic Value Score (Max 30 points)
    const response = await groq.chat.completions.create({
      model: MODEL,
      temperature: 0.2,
      messages: [
        {
          role: "user",
          content: `Evaluate the overall professional formatting, structural flow, and semantic value of this resume. ${jobContext ? `Consider how well the semantic narrative aligns with this job context: "${jobContext}"` : 'Evaluate against general industry ATS standards.'}
      
      Resume Data:
      ${JSON.stringify(resume)}
      
      Score the professional strength and impact from 0 to 30.
      Return ONLY a JSON object: {"semanticScore": number}`
        }
      ]
    });
    
    const parsed = extractJson(response.choices[0]?.message?.content || '{}');
    const semanticScore = parsed?.semanticScore ? parseInt(parsed.semanticScore) : 15;
    const finalSemanticScore = isNaN(semanticScore) ? 15 : Math.min(30, Math.max(0, semanticScore));

    const totalScore = baseScore + keywordScore + finalSemanticScore;
    return Math.min(100, Math.max(0, totalScore));
  } catch (error) {
    console.error("ATS Score Error:", error);
    return 50;
  }
};

export const analyzeJobLink = async (url: string): Promise<string> => {
  try {
    const response = await groq.chat.completions.create({
      model: MODEL,
      temperature: 0.6,
      messages: [
        {
          role: "user",
          content: `Extract the key job requirements, responsibilities, and desired skills from this URL: ${url}. Provide a concise summary.`
        }
      ]
    });
    return response.choices[0]?.message?.content || "Could not extract job details.";
  } catch (error) {
    console.error("Job Link Analysis Error:", error);
    return "Error analyzing job link.";
  }
};

export const generateCoverLetter = async (resume: ResumeData, jobDescription: string): Promise<string> => {
    try {
        const response = await groq.chat.completions.create({
            model: MODEL,
            temperature: 0.7,
            messages: [
                {
                    role: "user",
                    content: `Write ONLY THE BODY of a professional cover letter for the following person. 
            Do NOT include the date, address, formal salutation (like 'Dear...'), or formal closing (like 'Sincerely...'). 
            Focus on 3-4 strong paragraphs matching their skills to the role.
            
            Name: ${resume.name}
            Role: ${resume.role}
            Skills: ${resume.skills.join(', ')}
            Experience Summary: ${resume.summary}
            
            Context/Job Details: ${jobDescription || 'Standard professional application'}`
                }
            ]
        });
        return response.choices[0]?.message?.content || "";
    } catch (error) {
        return "Failed to generate cover letter. Please try again.";
    }
}



export const parseResume = async (content: string | { data: string, mimeType: string }): Promise<ResumeData | null> => {
  try {
    // For Groq API using standard text completion without files, we need to extract raw text
    // The previous implementation accepted { inlineData, mimeType } which is Gemini specific natively. 
    // We assume 'content' is primarily passed as string (or we convert to string representations).
    
    let textContent = '';
    if (typeof content === 'string') {
      textContent = content;
    } else if (content && typeof content === 'object' && 'data' in content) {
      // If base64 or objects come in, we just do our best to map it. If it's a PDF base64, Groq SDK might not support it identically.
      // Assuming it's small or we only get text for now since our app mostly uses raw text pasting.
      textContent = "Base64 payload received. Not supported purely natively without OCR. Assuming raw text input: " + JSON.stringify(content);
    }
    
    const response = await groq.chat.completions.create({
      model: MODEL,
      temperature: 0.4,
      messages: [
        {
          role: "user",
          content: `Extract structured resume data from this text. Maintain the professional tone and ensure the descriptions are neatly formatted and VERY concise (max 2-3 bullet points per role). Ensure all experience and education items have unique string IDs.
          
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
        ]
      }
      
      Text to parse:
      ${textContent}`
        }
      ]
    });

    const parsed = extractJson(response.choices[0]?.message?.content || '{}');
    if (parsed) {
      if (parsed.experience) {
        parsed.experience = parsed.experience.map((exp: any, i: number) => ({ ...exp, id: exp.id || `exp-${i}` }));
      } else { parsed.experience = []; }
      if (parsed.education) {
        parsed.education = parsed.education.map((ed: any, i: number) => ({ ...ed, id: ed.id || `ed-${i}` }));
      } else { parsed.education = []; }
      if (!parsed.skills) parsed.skills = [];
    }
    return parsed;
  } catch (error) {
    console.error("Parse Resume Error:", error);
    return null;
  }
};
