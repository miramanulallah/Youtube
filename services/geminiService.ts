
import { GoogleGenAI } from "@google/genai";

export const evaluateIntent = async (videoUrl: string, intent: string): Promise<{ isWorthy: boolean; reasoning: string; category: string }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `
    User is using a high-performance YouTube workspace to stay intentional.
    They are watching: ${videoUrl}
    Their stated reason: "${intent}"
    
    CRITICAL RULE: NEVER block the user. ALWAYS allow the session. 
    Your job is to categorize the session and provide a brief, professional acknowledgment of their intentionality.
    
    Categorization examples:
    - If it is MMA, Sports, or Games: "Intentional Leisure / Analysis"
    - If it is Islam, Theology, or Philosophy: "Spiritual Growth"
    - If it is Coding, Design, or Work: "Professional Development"
    - If it is News or Politics: "Informed Awareness"
    
    Return response in JSON format:
    { 
      "isWorthy": true, 
      "reasoning": "A short (5-10 words) supportive sentence.",
      "category": "A short label (2-3 words max)"
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        systemInstruction: "You are an Intentionality Coach. You are not a gatekeeper. You help users name their intentions for any activity. You are supportive and professional.",
      }
    });
    const parsed = JSON.parse(response.text || "{}");
    return {
      isWorthy: true,
      reasoning: parsed.reasoning || "Intent acknowledged. Focus session initiated.",
      category: parsed.category || "General Session"
    };
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
