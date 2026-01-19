
import { GoogleGenAI, Type } from "@google/genai";

// Fix: Use gemini-3-pro-preview for advanced reasoning tasks (intent analysis, study plans) and gemini-3-flash-preview for basic text/transcription tasks.
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

const PLAIN_TEXT_INSTRUCTION = "CRITICAL: Do NOT use any Markdown formatting. No bolding (**), no headers (#), no bullet points (*), no italics (_), no code blocks. Use only plain text and standard line breaks. If providing a list, use plain numbering (1., 2., 3.) or just separate lines.";

/**
 * Evaluates the user's intent for watching a video.
 * Uses gemini-3-pro-preview for advanced reasoning as an Intentionality Coach.
 */
export const evaluateIntent = async (videoUrl: string, intent: string): Promise<{ isWorthy: boolean; reasoning: string; category: string }> => {
  const ai = getAI();
  const prompt = `
    Analyze the user's intent for watching this YouTube video.
    Video URL: ${videoUrl}
    Stated Intent: "${intent}"
    
    Categorize the session and provide a professional acknowledgment.
  `;

  try {
    // Fix: Upgrade to gemini-3-pro-preview for better intent analysis reasoning.
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isWorthy: { type: Type.BOOLEAN, description: "Whether the intent is considered worthy of a session." },
            reasoning: { type: Type.STRING, description: "Professional acknowledgment in plain text." },
            category: { type: Type.STRING, description: "Short session category name." }
          },
          required: ["isWorthy", "reasoning", "category"]
        },
        systemInstruction: `You are an Intentionality Coach. ${PLAIN_TEXT_INSTRUCTION} Always return valid JSON.`,
      }
    });
    
    // Fix: Accessing .text property directly instead of calling it as a method.
    const text = response.text || "{}";
    const parsed = JSON.parse(text);
    
    return {
      isWorthy: parsed.isWorthy ?? true,
      reasoning: parsed.reasoning || "Proceed with intention.",
      category: parsed.category || "Focus Session"
    };
  } catch (error) {
    console.error("AI Error:", error);
    return { isWorthy: true, reasoning: "Focus maintained. Proceed.", category: "General" };
  }
};

/**
 * Generates study aids such as plans, quizzes, or summaries using gemini-3-pro-preview.
 */
export const generateStudyAid = async (
  videoTitle: string, 
  userNotes: string, 
  mode: 'plan' | 'quiz' | 'summary'
): Promise<string> => {
  const ai = getAI();
  
  const prompt = mode === 'plan' 
    ? `Create a plain text study plan for "${videoTitle}". List 3 objectives clearly without any markdown.`
    : mode === 'quiz'
    ? `Generate 3 plain text quiz questions about "${videoTitle}" based on these notes: "${userNotes}".`
    : `Synthesize these notes into a clean, plain text summary: "${userNotes}" from "${videoTitle}".`;

  try {
    // Fix: Upgrade to gemini-3-pro-preview for high-quality educational content generation.
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        systemInstruction: `You are a master educator. ${PLAIN_TEXT_INSTRUCTION}`,
      }
    });
    // Fix: Use .text property.
    return response.text || "Synthesis complete.";
  } catch (error) {
    console.error("Aid Error:", error);
    return "Error generating aid. Please ensure your session and API key are valid.";
  }
};

/**
 * Transcribes audio using gemini-3-flash-preview.
 */
export const transcribeAudio = async (base64Audio: string): Promise<string> => {
  const ai = getAI();
  try {
    // Fix: Use gemini-3-flash-preview for standard transcription tasks.
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'audio/wav',
              data: base64Audio,
            },
          },
          { text: "Transcribe this audio into plain text. No markdown." },
        ]
      },
      config: {
        systemInstruction: PLAIN_TEXT_INSTRUCTION
      }
    });
    // Fix: Use .text property.
    return response.text?.trim() || "";
  } catch (error) {
    console.error("Transcription error:", error);
    return "";
  }
};

/**
 * Provides quick chat functionality based on session context.
 */
export const quickChat = async (message: string, context: string): Promise<string> => {
  const ai = getAI();
  try {
    // Fix: Use gemini-3-pro-preview for contextual conversational reasoning.
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Context: ${context}\n\nUser Question: ${message}`,
      config: {
        systemInstruction: `You are a helpful assistant. Provide answers in plain text only. No markdown. ${PLAIN_TEXT_INSTRUCTION}`,
      }
    });
    // Fix: Use .text property.
    return response.text || "Assistant response generated.";
  } catch (error) {
    console.error("Chat Error:", error);
    return "Error connecting to AI workspace services.";
  }
};
