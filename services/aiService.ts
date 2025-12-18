
import { GoogleGenAI } from "@google/genai";

// Vérification sécurisée de la clé API
const API_KEY = (typeof process !== 'undefined' && process.env.API_KEY) ? process.env.API_KEY : null;

// Initialisation conditionnelle de Gemini
const genAI = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

/**
 * Moteur de diagnostic local (Fallback sans Gemini)
 * Permet au SaaS de fonctionner immédiatement sans configuration complexe.
 */
const localExpertDiagnostic = (symptoms: string): string => {
  const s = symptoms.toLowerCase();
  let suggestions = "### 🛠️ Diagnostic Expert Local\n\n";
  
  if (s.includes('frein') || s.includes('siffle')) {
    suggestions += "- **Cause possible :** Plaquettes de frein usées ou glaçage des disques.\n- **Action :** Vérifier l'épaisseur des garnitures et l'état de surface des disques.\n- **Difficulté :** Moyenne (🔧🔧)";
  } else if (s.includes('batterie') || s.includes('démarre pas')) {
    suggestions += "- **Cause possible :** Batterie déchargée ou alternateur défaillant.\n- **Action :** Tester le voltage au repos (min 12.4V) et moteur tournant (env. 14V).\n- **Difficulté :** Facile (🔧)";
  } else if (s.includes('fumée') || s.includes('huile')) {
    suggestions += "- **Cause possible :** Consommation d'huile excessive ou fuite au turbo.\n- **Action :** Contrôler les niveaux et l'étanchéité du circuit d'admission.\n- **Difficulté :** Difficile (🔧🔧🔧)";
  } else if (s.includes('claque') || s.includes('bruit')) {
    suggestions += "- **Cause possible :** Jeu dans les silentblocs ou biellettes de barre stabilisatrice.\n- **Action :** Mise sur pont et contrôle des jeux de train avant.\n- **Difficulté :** Moyenne (🔧🔧)";
  } else {
    suggestions += "- **Analyse :** Symptômes génériques détectés.\n- **Action :** Passage à la valise de diagnostic recommandé pour lire les codes défaut (DTC).\n- **Difficulté :** Variable.";
  }

  suggestions += "\n\n*Note : Ce diagnostic est généré par le moteur local expert de GaragePro.*";
  return suggestions;
};

export const getDiagnosticSuggestions = async (symptoms: string) => {
  if (!symptoms) return "Veuillez entrer des symptômes.";

  // Si Gemini est configuré, on l'utilise
  if (genAI) {
    try {
      const response = await genAI.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `En tant qu'expert mécanicien, diagnostique ceci : "${symptoms}". Donne 3 causes, les étapes de vérification et la difficulté. Format Markdown.`,
      });
      return response.text || localExpertDiagnostic(symptoms);
    } catch (error) {
      console.warn("Gemini indisponible, bascule sur l'expert local.");
      return localExpertDiagnostic(symptoms);
    }
  }

  // Sinon, fallback immédiat sur l'expert local (indépendant de Google)
  return localExpertDiagnostic(symptoms);
};

export const generateCustomerMessage = async (serviceDetails: string, customerName: string) => {
  const fallbackMsg = `Bonjour ${customerName}, nous avons avancé sur votre véhicule (${serviceDetails}). Nous vous tenons informé de la suite des opérations. Cordialement, votre garage.`;
  
  if (genAI) {
    try {
      const response = await genAI.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Rédige un SMS professionnel court pour ${customerName} concernant : ${serviceDetails}.`,
      });
      return response.text || fallbackMsg;
    } catch (error) {
      return fallbackMsg;
    }
  }
  
  return fallbackMsg;
};
