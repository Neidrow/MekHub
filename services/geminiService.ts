
import { GoogleGenAI } from "@google/genai";

// Fixed: Strictly use process.env.API_KEY as per library initialization guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getDiagnosticSuggestions = async (symptoms: string) => {
  try {
    const response = await ai.models.generateContent({
      // Updated to gemini-3-pro-preview for complex reasoning tasks like diagnostics
      model: 'gemini-3-pro-preview',
      contents: `As an expert automotive mechanic, diagnose the following vehicle symptoms: "${symptoms}". Provide a list of 3-5 possible causes, recommended inspection steps, and an estimated repair difficulty level. Format the response in Markdown.`,
    });
    return response.text || "No suggestions available.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Failed to get AI diagnosis. Please check your connection.";
  }
};

export const generateCustomerMessage = async (serviceDetails: string, customerName: string) => {
  try {
    const response = await ai.models.generateContent({
      // gemini-3-flash-preview is suitable for basic text generation tasks
      model: 'gemini-3-flash-preview',
      contents: `Write a professional and friendly SMS/Email message to a customer named "${customerName}" informing them about their vehicle service progress: "${serviceDetails}". Keep it concise and professional.`,
    });
    return response.text || "No message generated.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Failed to generate message.";
  }
};
