
import { GoogleGenAI, Type } from "@google/genai";
import { ResumeData, AISuggestion } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const getAISuggestions = async (resume: ResumeData): Promise<AISuggestion[]> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analyze this resume and provide 3 punchy, high-impact rewrite suggestions to improve ATS score and professional impact. 
      Format as JSON array of objects with keys: id, type (REWRITE, IMPACT, QUANTIFY), original (the specific text part being improved), suggestion (the improved text), field (which field it belongs to).
      
      CRITICAL: For experience fields, the 'field' value MUST be 'experience:<id>' where <id> is the ID provided in the context. For the summary, use 'summary'.
      
      Resume Context:
      Name: ${resume.name}
      Role: ${resume.role}
      Summary [ID: summary]: ${resume.summary}
      Experience Items:
      ${resume.experience.map(e => `[ID: ${e.id}] ${e.description}`).join('\n')}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              type: { type: Type.STRING },
              original: { type: Type.STRING },
              suggestion: { type: Type.STRING },
              field: { type: Type.STRING },
            },
            required: ["id", "type", "original", "suggestion", "field"]
          }
        }
      }
    });

    return JSON.parse(response.text || '[]');
  } catch (error) {
    console.error("AI Suggestions Error:", error);
    return [];
  }
};

export const calculateATSScore = (resume: ResumeData): number => {
  let score = 50; // Base score
  
  if (resume.summary.length > 100) score += 10;
  if (resume.experience.length >= 2) score += 10;
  if (resume.skills.length >= 5) score += 10;
  
  // Look for "impact" words
  const impactWords = ['orchestrated', 'spearheaded', 'managed', 'developed', 'optimized', 'reduced', 'increased', 'architected', 'facilitated'];
  const desc = resume.experience.map(e => e.description.toLowerCase()).join(' ');
  impactWords.forEach(word => {
    if (desc.includes(word)) score += 2;
  });

  return Math.min(score, 100);
};

export const generateCoverLetter = async (resume: ResumeData, jobDescription: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Write ONLY THE BODY of a professional cover letter for the following person. 
            Do NOT include the date, address, formal salutation (like 'Dear...'), or formal closing (like 'Sincerely...'). 
            Focus on 3-4 strong paragraphs matching their skills to the role.
            
            Name: ${resume.name}
            Role: ${resume.role}
            Skills: ${resume.skills.join(', ')}
            Experience Summary: ${resume.summary}
            
            Context/Job Details: ${jobDescription || 'Standard professional application'}`,
        });
        return response.text || "";
    } catch (error) {
        return "Failed to generate cover letter. Please try again.";
    }
}
