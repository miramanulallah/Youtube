
import { GoogleGenAI } from "@google/genai";

export const evaluateIntent = async (videoUrl: string, intent: string): Promise<{ isWorthy: boolean; reasoning: string; category: string }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `
    User is using a high-performance YouTube workspace to stay intentional.
    They are watching: ${videoUrl}
    Their stated reason: "${intent}"
    
    Instead of blocking them, your job is to acknowledge their intent and categorize the session.
    Even if it is entertainment (like MMA, sports, movies), allow it, but frame it as "Intentional Recovery" or "Leisure". 
    If it is educational/dev/Islam/development, frame it as "Deep Work" or "Learning".
    
    Return response in JSON format:
    { 
      "isWorthy": true, 
      "reasoning": "A short, supportive sentence acknowledging the intent",
      "category": "A short label like 'Development', 'Spirituality', 'Leisure', 'Deep Work', etc."
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        systemInstruction: "You are an Intentionality Coach. You don't block content; you ensure the user is aware of WHY they are watching. You are supportive and professional.",
      }
    });
    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("AI Error:", error);
    return { isWorthy: true, reasoning: "Proceed with intention.", category: "General" };
  }
};

export const generateStudyAid = async (
  videoTitle: string, 
  userNotes: string, 
  mode: 'plan' | 'quiz' | 'summary'
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  let prompt = "";
  if (mode === 'plan') {
    prompt = `Create a high-intensity study plan for "${videoTitle}". 3 core objectives.`;
  } else if (mode === 'quiz') {
    prompt = `3 challenging questions about "${videoTitle}".`;
  } else if (mode === 'summary') {
    prompt = `Refine these notes for long-term retention: "${userNotes}" from "${videoTitle}".`;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: "You are a master educator. Plain text only. No markdown.",
      }
    });
    return response.text || "No response.";
  } catch (error) {
    return "Error generating aid.";
  }
};
