
import { GoogleGenAI } from "@google/genai";

const localExpertDiagnostic = (symptoms: string): string => {
  const s = symptoms.toLowerCase();
  let suggestions = "### 🛠️ Diagnostic Expert Local\n\n";
  if (s.includes('frein')) suggestions += "- **Cause possible :** Usure des plaquettes.\n- **Action :** Vérifier l'épaisseur.\n";
  else if (s.includes('batterie')) suggestions += "- **Cause possible :** Tension faible.\n- **Action :** Tester au multimètre.\n";
  else suggestions += "- **Analyse :** Symptômes nécessitant une inspection visuelle.\n";
  return suggestions + "\n*Mode local actif.*";
};

export const getDiagnosticSuggestions = async (symptoms: string) => {
  if (!symptoms) return "Veuillez entrer des symptômes.";
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `En tant qu'expert mécanicien, diagnostique ceci : "${symptoms}". Donne 3 causes, étapes et difficulté. Markdown court.`,
    });
    return response.text || localExpertDiagnostic(symptoms);
  } catch (error) {
    return localExpertDiagnostic(symptoms);
  }
};

export const generateCustomerMessage = async (serviceDetails: string, customerName: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Rédige un SMS pro pour ${customerName} sur : ${serviceDetails}. Max 160 caractères.`,
    });
    return response.text || `Bonjour ${customerName}, travaux finis : ${serviceDetails}.`;
  } catch (error) {
    return `Bonjour ${customerName}, travaux finis : ${serviceDetails}.`;
  }
};
