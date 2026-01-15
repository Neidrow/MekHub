
import { GoogleGenAI } from "@google/genai";

// Fonction utilitaire pour récupérer la clé API peu importe l'environnement (Vite ou Node)
const getApiKey = (): string | undefined => {
  // 1. Essayer via import.meta.env (Standard Vite pour le frontend)
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_KEY) {
    // @ts-ignore
    return import.meta.env.VITE_API_KEY;
  }
  
  // 2. Essayer via process.env (Compatibilité Node/Webpack)
  if (typeof process !== 'undefined' && process.env) {
    // @ts-ignore
    if (process.env.VITE_API_KEY) return process.env.VITE_API_KEY;
    if (process.env.API_KEY) return process.env.API_KEY;
  }
  
  return undefined;
};

// Prompt système expert pour le diagnostic mécanique - Niveau Technicien
const DIAGNOSTIC_SYSTEM_PROMPT = `Tu es un Chef d'Atelier Expert Automobile. Tu assistes un mécanicien professionnel.

🎯 OBJECTIF : 
Donner un diagnostic structuré, priorisé et directement exploitable à l'atelier.

🗣️ TON ET STYLE : 
- Parle de pro à pro : sois technique, précis, mais pédagogue.
- Va droit au but. Pas de phrases inutiles.
- Utilise le vocabulaire métier (ex: "valise", "multimètre", "jeu axial", "encrassement").

⛔ FORMATTAGE (TRES IMPORTANT) :
- N'utilise PAS de gras markdown (**) car l'interface ne le gère pas.
- Pour mettre en évidence les PIÈCES et les ACTIONS, utilise des MAJUSCULES.
- Respecte strictement la structure ci-dessous avec les émojis.

🧾 STRUCTURE DE LA RÉPONSE :

🔍 ANALYSE RAPIDE
[Une phrase simple résumant le problème technique]

📉 HYPOTHÈSES PRIORITAIRES (Top 3)
1️⃣ [NOM DE LA PANNE EN MAJUSCULES]
   ↳ [Pourquoi c'est le suspect n°1 : lien technique symptôme/cause]

2️⃣ [NOM DE LA PANNE EN MAJUSCULES]
   ↳ [Explication technique concise]

3️⃣ [NOM DE LA PANNE EN MAJUSCULES]
   ↳ [Explication technique concise]

🛠️ VÉRIFICATIONS ATELIER
👉 [ACTION 1 EN MAJUSCULES] : [Détail (ex: Lecture codes défauts, Contrôle visuel...)]
👉 [ACTION 2 EN MAJUSCULES] : [Détail (ex: Test des retours injecteurs, Prise de compressions)]
👉 [ACTION 3 EN MAJUSCULES] : [Détail (ex: Essai routier spécifique)]

⚠️ VIGILANCE
[Un point de sécurité ou une erreur de débutant à éviter]`;

const localExpertDiagnostic = (symptoms: string): string => {
  const s = symptoms.toLowerCase();
  let suggestions = "🛠️ DIAGNOSTIC LOCAL (MODE SECOURS)\n\n";
  
  if (s.includes('frein')) {
    suggestions += "📉 HYPOTHÈSES PRIORITAIRES\n1️⃣ PLAQUETTES DE FREIN HS\n   ↳ Garniture sous la cote minimale ou glacée.\n2️⃣ DISQUES VOILÉS\n   ↳ Si vibrations importantes ressenties dans la pédale.\n\n🛠️ VÉRIFICATIONS ATELIER\n👉 DÉPOSER LES ROUES : Contrôle visuel de l'épaisseur et de l'état des surfaces.\n👉 CONTRÔLER LE VOILE : Utiliser un comparateur sur les disques.\n";
  } else if (s.includes('batterie') || s.includes('démarrage')) {
    suggestions += "📉 HYPOTHÈSES PRIORITAIRES\n1️⃣ BATTERIE DÉCHARGÉE OU HS\n   ↳ Élément en court-circuit ou manque de capacité (CCA).\n2️⃣ ALTERNATEUR DÉFAILLANT\n   ↳ Ne recharge plus la batterie (charbons usés, régulateur HS).\n\n🛠️ VÉRIFICATIONS ATELIER\n👉 TESTER LA TENSION BATTERIE : Doit être > 12.5V à l'arrêt.\n👉 TESTER LA CHARGE : Moteur tournant, on doit avoir entre 13.5V et 14.5V.\n";
  } else {
    suggestions += "🔍 ANALYSE RAPIDE\nSymptôme générique nécessitant une investigation standard.\n\n🛠️ VÉRIFICATIONS ATELIER\n👉 LECTURE CODES DÉFAUTS : Brancher la valise OBD pour relever les DTC.\n👉 ESSAI ROUTIER : Reproduire le défaut pour affiner le ressenti.\n";
  }
  
  return suggestions + "\n⚠️ CLÉ API NON DÉTECTÉE - Vérifiez la configuration Vercel (VITE_API_KEY).";
};

export const getDiagnosticSuggestions = async (symptoms: string) => {
  if (!symptoms) return "Veuillez entrer des symptômes.";
  
  const apiKey = getApiKey();

  if (!apiKey) {
    console.error("❌ CLÉ API MANQUANTE : Assurez-vous d'avoir ajouté 'VITE_API_KEY' dans les variables d'environnement Vercel.");
    return localExpertDiagnostic(symptoms);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Symptômes du véhicule : "${symptoms}"`,
      config: {
        systemInstruction: DIAGNOSTIC_SYSTEM_PROMPT,
        temperature: 0.2,
      },
    });
    return response.text || localExpertDiagnostic(symptoms);
  } catch (error: any) {
    console.error("❌ ERREUR API GEMINI :", error);
    return localExpertDiagnostic(symptoms);
  }
};

export const generateCustomerMessage = async (serviceDetails: string, customerName: string) => {
  const apiKey = getApiKey();
  
  const fallbackMessage = `Bonjour ${customerName}, les travaux suivants sont terminés : ${serviceDetails}. Vous pouvez récupérer votre véhicule. Cordialement.`;

  if (!apiKey) return fallbackMessage;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Rédige un SMS professionnel pour un client de garage automobile.
      Nom Client : ${customerName}
      Contexte : ${serviceDetails}
      
      CONSIGNES :
      - Court, poli et factuel (format SMS).
      - Pas d'objet, pas de titre.
      - Indique que le véhicule est prêt si le contexte s'y prête.`,
    });
    return response.text || fallbackMessage;
  } catch (error) {
    console.error("Erreur IA Message:", error);
    return fallbackMessage;
  }
};
