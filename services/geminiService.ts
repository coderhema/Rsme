
import { GoogleGenAI, Type } from "@google/genai";
import { ResumeData, AISuggestion } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const getAISuggestions = async (resume: ResumeData, jobContext?: string): Promise<AISuggestion[]> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analyze this resume ${jobContext ? `against this job context: "${jobContext}"` : ''} and provide 3-5 punchy, high-impact rewrite suggestions to improve ATS score and professional impact. 
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

export const calculateATSScore = async (resume: ResumeData, jobContext?: string): Promise<number> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Evaluate this resume ${jobContext ? `against this job context: "${jobContext}"` : ''} and provide a single integer score from 0 to 100 representing its ATS compatibility and professional strength.
      
      Resume:
      ${JSON.stringify(resume)}
      
      Return ONLY the integer number.`,
    });
    
    const score = parseInt(response.text?.trim() || '50');
    return isNaN(score) ? 50 : Math.min(100, Math.max(0, score));
  } catch (error) {
    console.error("ATS Score Error:", error);
    return 50;
  }
};

export const analyzeJobLink = async (url: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Extract the key job requirements, responsibilities, and desired skills from this URL: ${url}`,
      config: {
        tools: [{ urlContext: {} }]
      },
    });
    return response.text || "Could not extract job details.";
  } catch (error) {
    console.error("Job Link Analysis Error:", error);
    return "Error analyzing job link.";
  }
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

export const roastResume = async (resume: ResumeData | string): Promise<string> => {
  try {
    const resumeText = typeof resume === 'string' ? resume : JSON.stringify(resume);
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are a brutal, sarcastic, and hilarious resume roaster. 
      Analyze the following resume and give a scathing but funny roast. 
      Point out the clichés, the gaps, the over-inflated titles, and the boring skills.
      Keep it under 200 words. Use emojis.
      
      Resume:
      ${resumeText}`,
    });
    return response.text || "Your resume is so boring I fell asleep before I could roast it.";
  } catch (error) {
    console.error("Roast Error:", error);
    return "Even the AI is too stunned to speak about this resume.";
  }
};
