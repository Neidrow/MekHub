
import { GoogleGenAI } from "@google/genai";

// Utilisation directe selon les directives de sécurité
// L'environnement se charge d'injecter la valeur dans process.env.API_KEY
const genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Moteur de diagnostic local (Indépendant de toute API externe)
 * Garantit que le SaaS fonctionne même sans clé ou hors-ligne.
 */
const localExpertDiagnostic = (symptoms: string): string => {
  const s = symptoms.toLowerCase();
  let suggestions = "### 🛠️ Diagnostic Expert Local\n\n";
  
  if (s.includes('frein') || s.includes('siffle') || s.includes('bruit')) {
    suggestions += "- **Cause possible :** Usure des plaquettes ou disques voilés.\n- **Action :** Mesurer l'épaisseur des garnitures.\n- **Difficulté :** 🔧🔧";
  } else if (s.includes('batterie') || s.includes('démarre') || s.includes('voyant')) {
    suggestions += "- **Cause possible :** Tension batterie faible ou alternateur fatigué.\n- **Action :** Tester la batterie au multimètre (12.6V requis).\n- **Difficulté :** 🔧";
  } else if (s.includes('fumée') || s.includes('noir') || s.includes('blanc')) {
    suggestions += "- **Cause possible :** Problème d'injection ou joint de culasse.\n- **Action :** Vérifier les niveaux de liquide et passer la valise.\n- **Difficulté :** 🔧🔧🔧";
  } else {
    suggestions += "- **Analyse :** Symptômes nécessitant une inspection visuelle approfondie.\n- **Action :** Vérifier les niveaux de fluides et les trains roulants.\n- **Note :** Utilisez un scanner OBD-II pour plus de précision.";
  }

  suggestions += "\n\n*Note : Ce diagnostic provient du moteur interne GaragePro.*";
  return suggestions;
};

export const getDiagnosticSuggestions = async (symptoms: string) => {
  if (!symptoms) return "Veuillez entrer des symptômes.";

  try {
    // Tentative avec Gemini
    const response = await genAI.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `En tant qu'expert mécanicien, diagnostique ceci : "${symptoms}". Donne 3 causes, les étapes de vérification et la difficulté. Format Markdown court.`,
    });
    
    if (response && response.text) {
      return response.text;
    }
    return localExpertDiagnostic(symptoms);
  } catch (error) {
    console.error("Erreur API Gemini (Clé ou Quota) :", error);
    // Bascule automatique sur l'expert local sans interrompre l'utilisateur
    return localExpertDiagnostic(symptoms);
  }
};

export const generateCustomerMessage = async (serviceDetails: string, customerName: string) => {
  const fallbackMsg = `Bonjour ${customerName}, nous avons terminé l'intervention suivante : ${serviceDetails}. Votre véhicule est prêt. Cordialement, votre garage.`;
  
  try {
    const response = await genAI.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Rédige un SMS professionnel et poli pour ${customerName} concernant : ${serviceDetails}. Max 160 caractères.`,
    });
    return response.text || fallbackMsg;
  } catch (error) {
    return fallbackMsg;
  }
};
