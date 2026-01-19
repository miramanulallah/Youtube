import { GoogleGenAI } from "@google/genai";

// Using gemini-flash-lite-latest as the high-performance, free-tier compatible model.
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

const PLAIN_TEXT_INSTRUCTION = "CRITICAL: Do NOT use any Markdown formatting. No bolding (**), no headers (#), no bullet points (*), no italics (_), no code blocks. Use only plain text and standard line breaks. If providing a list, use plain numbering (1., 2., 3.) or just separate lines.";

export const evaluateIntent = async (videoUrl: string, intent: string): Promise<{ isWorthy: boolean; reasoning: string; category: string }> => {
  const ai = getAI();
  const prompt = `
    Analyze the user's intent for watching this YouTube video.
    Video URL: ${videoUrl}
    Stated Intent: "${intent}"
    
    Categorize the session and provide a professional, plain text acknowledgment.
    
    Return response in strict JSON format:
    { 
      "isWorthy": true, 
      "reasoning": "Supporting sentence in plain text.",
      "category": "Short session category"
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-flash-lite-latest',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        systemInstruction: `You are an Intentionality Coach. ${PLAIN_TEXT_INSTRUCTION} Always return valid JSON.`,
      }
    });
    
    // Safety check for JSON parsing
    const text = response.text || "{}";
    const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    
    return {
      isWorthy: true,
      reasoning: parsed.reasoning || "Proceed with intention.",
      category: parsed.category || "Focus Session"
    };
  } catch (error) {
    console.error("AI Error:", error);
    return { isWorthy: true, reasoning: "Focus maintained. Proceed.", category: "General" };
  }
};

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
    const response = await ai.models.generateContent({
      model: 'gemini-flash-lite-latest',
      contents: prompt,
      config: {
        systemInstruction: `You are a master educator. ${PLAIN_TEXT_INSTRUCTION}`,
      }
    });
    return response.text || "Synthesis complete.";
  } catch (error) {
    console.error("Aid Error:", error);
    return "Error generating aid. Please ensure your session and API key are valid.";
  }
};

export const transcribeAudio = async (base64Audio: string): Promise<string> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-flash-lite-latest',
      contents: [
        {
          inlineData: {
            mimeType: 'audio/wav',
            data: base64Audio,
          },
        },
        { text: "Transcribe this audio into plain text. No markdown." },
      ],
      config: {
        systemInstruction: PLAIN_TEXT_INSTRUCTION
      }
    });
    return response.text?.trim() || "";
  } catch (error) {
    console.error("Transcription error:", error);
    return "";
  }
};

export const quickChat = async (message: string, context: string): Promise<string> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-flash-lite-latest',
      contents: `Context: ${context}\n\nUser Question: ${message}`,
      config: {
        systemInstruction: `You are a helpful assistant. Provide answers in plain text only. No markdown. ${PLAIN_TEXT_INSTRUCTION}`,
      }
    });
    return response.text || "Assistant response generated.";
  } catch (error) {
    console.error("Chat Error:", error);
    return "Error connecting to AI workspace services.";
  }
};