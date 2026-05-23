import { ResumeData, AISuggestion } from "../types";

const AI_SERVER_URL = "http://localhost:3001/api/ai";

const postJson = async <T>(path: string, payload: Record<string, unknown>): Promise<T> => {
  const response = await fetch(`${AI_SERVER_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
};

export const getAISuggestions = async (resume: ResumeData, jobContext?: string): Promise<AISuggestion[]> => {
  try {
    const data = await postJson<{ suggestions: AISuggestion[] }>("/suggestions", {
      resume,
      jobContext,
    });
    return data.suggestions || [];
  } catch (error) {
    console.error("AI Suggestions Error:", error);
    return [];
  }
};

export const calculateATSScore = async (resume: ResumeData, jobContext?: string): Promise<number> => {
  try {
    const data = await postJson<{ score: number }>("/ats-score", {
      resume,
      jobContext,
    });
    return typeof data.score === "number" ? data.score : 50;
  } catch (error) {
    console.error("ATS Score Error:", error);
    return 50;
  }
};

export const analyzeJobLink = async (url: string): Promise<string> => {
  try {
    const data = await postJson<{ details: string }>("/job-link", { url });
    return data.details || "Could not extract job details.";
  } catch (error) {
    console.error("Job Link Analysis Error:", error);
    return "Error analyzing job link.";
  }
};

export const generateCoverLetter = async (resume: ResumeData, jobDescription: string): Promise<string> => {
    try {
        const data = await postJson<{ content: string }>("/cover-letter", {
          resume,
          jobDescription,
        });
        return data.content || "";
    } catch (error) {
        return "Failed to generate cover letter. Please try again.";
    }
}



export const parseResume = async (content: string | { data: string, mimeType: string }): Promise<ResumeData | null> => {
  try {
    const text = typeof content === "string" ? content : JSON.stringify(content || "");
    const data = await postJson<{ parsed: ResumeData | null }>("/parse-resume", {
      text,
    });
    return data.parsed || null;
  } catch (error) {
    console.error("Parse Resume Error:", error);
    return null;
  }
};
