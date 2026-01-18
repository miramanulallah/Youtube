
import { GoogleGenAI } from "@google/genai";

/**
 * Generates study content using the Gemini 3 Flash model.
 * Adheres to guidelines by initializing the GoogleGenAI instance inside the function
 * using the mandatory process.env.API_KEY environment variable.
 */
export const generateStudyAid = async (
  videoTitle: string, 
  userNotes: string, 
  mode: 'plan' | 'quiz' | 'summary'
): Promise<string> => {
  // Always create a new GoogleGenAI instance right before the call to ensure the latest key is used.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  let prompt = "";

  if (mode === 'plan') {
    prompt = `I am studying a video titled "${videoTitle}". 
    Create a structured study plan with 3 key learning objectives and a suggested practical exercise. 
    Use ONLY plain text. Do NOT use Markdown, do NOT use bold stars, do NOT use hashtags for headers. 
    Keep it concise and motivating.`;
  } else if (mode === 'quiz') {
    prompt = `Based on the topic "${videoTitle}", generate 3 multiple-choice conceptual questions to test my understanding. 
    Include the correct answer at the bottom. 
    Use ONLY plain text. Do NOT use Markdown, bolding, or special symbols.`;
  } else if (mode === 'summary') {
    prompt = `I have taken these notes while watching "${videoTitle}":
    "${userNotes}"
    
    Please refine these notes, organize them into simple lines, and add missing context based on the video topic. 
    Use ONLY plain text. Do NOT use Markdown formatting like bullet points (* or -), bolding (**), or headers (#).`;
  }

  try {
    // Using ai.models.generateContent directly with the model and prompt as per updated SDK guidelines.
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: "You are a helpful study assistant. Always provide responses in plain text only. Never use Markdown syntax like hashtags for headers, asterisks for bold/italic, or backticks for code. Use standard line breaks and spacing for organization.",
      }
    });
    // Directly accessing the .text property from the response object.
    return response.text || "No response generated.";
  } catch (error) {
    console.error("AI Error:", error);
    return "Unable to generate content. Service might be unavailable.";
  }
};
